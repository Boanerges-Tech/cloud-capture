import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import { useDropzone } from 'react-dropzone';
import {
  Camera, Video, Upload, Moon, Sun, LogOut, Trash2, Download,
  Share2, FolderPlus, Tag, Search, Filter, Grid, List,
  CreditCard, Crown, Folder, MoreVertical
} from 'lucide-react';
import { useTheme } from './ThemeContext';
import { API_BASE } from '../config/api';

function Dashboard({ user, setUser }) {
  const { darkMode, toggleTheme } = useTheme();
  const [media, setMedia] = useState([]);
  const [folders, setFolders] = useState([]);
  const [usedBytes, setUsedBytes] = useState(0);
  const [plan, setPlan] = useState('free');
  const [quotaBytes, setQuotaBytes] = useState(400 * 1024 * 1024);
  const [captureMode, setCaptureMode] = useState('photo');
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareExpires, setShareExpires] = useState(24);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadMedia();
    loadSubscription();
  }, []);

  const loadMedia = async () => {
    try {
      const res = await axios.get(`${API_BASE}/media/list`);
      setMedia(res.data.media);
      setUsedBytes(res.data.usedBytes);
      setPlan(res.data.plan);
      setQuotaBytes(res.data.quotaBytes);
      setFolders(res.data.folders || []);
    } catch (err) {
      console.error('Failed to load media', err);
    }
  };

  const loadSubscription = async () => {
    try {
      const res = await axios.get(`${API_BASE}/payments/subscription`);
      setPlan(res.data.plan);
    } catch (err) {
      console.error('Failed to load subscription', err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: captureMode === 'video'
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Camera access denied');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      await uploadFile(file);
    }, 'image/jpeg');
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    const recorder = new MediaRecorder(streamRef.current);
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], 'video.webm', { type: 'video/webm' });
      await uploadFile(file);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const compressImage = async (file) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error('Image compression failed:', error);
      return file;
    }
  };

  const uploadFile = async (file, folder = 'default', tags = []) => {
    setUploading(true);
    try {
      let processedFile = file;

      // Compress images
      if (file.type.startsWith('image/')) {
        processedFile = await compressImage(file);
      }

      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('folder', folder);
      formData.append('tags', tags.join(','));

      const res = await axios.post(`${API_BASE}/media/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMedia([res.data.item, ...media]);
      setUsedBytes(res.data.usedBytes);

      if (res.data.usedBytes > quotaBytes) {
        alert('Storage limit reached! Upgrade to premium for unlimited storage.');
      }
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      for (const file of acceptedFiles) {
        await uploadFile(file);
      }
    },
    accept: {
      'image/*': [],
      'video/*': []
    },
    multiple: true
  });

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => uploadFile(file));
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await axios.post(`${API_BASE}/media/create-folder`, { name: newFolderName });
      setNewFolderName('');
      setShowCreateFolder(false);
      loadMedia();
    } catch (err) {
      alert('Failed to create folder');
    }
  };

  const shareMedia = async (mediaId) => {
    try {
      const res = await axios.post(`${API_BASE}/media/share/${mediaId}`, { expiresIn: shareExpires });
      setShareUrl(res.data.shareUrl);
      setShowShareModal(true);
    } catch (err) {
      alert('Failed to generate share link');
    }
  };

  const deleteMedia = async (mediaId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await axios.delete(`${API_BASE}/media/${mediaId}`);
      setMedia(media.filter(m => m.id !== mediaId));
      loadMedia();
    } catch (err) {
      alert('Failed to delete media');
    }
  };

  const moveToFolder = async (mediaId, folderId) => {
    try {
      await axios.put(`${API_BASE}/media/move-to-folder/${mediaId}`, { folderId });
      loadMedia();
    } catch (err) {
      alert('Failed to move media');
    }
  };

  const initiatePayment = async (currency = 'NGN') => {
    try {
      const res = await axios.post(`${API_BASE}/payments/initialize`, { currency });
      window.location.href = res.data.authorization_url;
    } catch (err) {
      alert('Failed to initialize payment');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredMedia = media.filter(item => {
    const matchesFolder = selectedFolder === 'all' || item.folder === selectedFolder;
    const matchesSearch = !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    return matchesFolder && matchesSearch;
  });

  const usedPercent = (usedBytes / quotaBytes) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Camera className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">CloudCapture</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={logout} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Storage Usage */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Storage Usage</h3>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Used</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${usedPercent > 90 ? 'bg-red-600' : usedPercent > 75 ? 'bg-yellow-600' : 'bg-blue-600'}`}
                    style={{ width: `${Math.min(usedPercent, 100)}%` }}
                  ></div>
                </div>
              </div>
              {usedBytes > quotaBytes && (
                <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded">
                  <p className="text-sm">Storage limit exceeded! Upgrade to premium.</p>
                </div>
              )}
            </div>

            {/* Account */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Account</h3>
              <div className="space-y-2 mb-4">
                <p className="text-gray-600 dark:text-gray-400">Name: {user.name}</p>
                <p className="text-gray-600 dark:text-gray-400">Email: {user.email}</p>
                <p className="text-gray-600 dark:text-gray-400">Plan: {plan === 'free' ? 'Free' : 'Premium'}</p>
              </div>
              {plan === 'free' && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Crown className="w-4 h-4" />
                  <span>Upgrade to Premium - $5/month</span>
                </button>
              )}
            </div>

            {/* Folders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Folders</h3>
                <button
                  onClick={() => setShowCreateFolder(true)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedFolder('all')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedFolder === 'all'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  All Files
                </button>
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                      selectedFolder === folder.name
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Folder className="w-4 h-4" />
                    <span>{folder.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Capture/Upload Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Capture & Upload</h2>

              {/* Camera Controls */}
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => setCaptureMode('photo')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    captureMode === 'photo' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  <span>Photo</span>
                </button>
                <button
                  onClick={() => setCaptureMode('video')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    captureMode === 'video' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Video className="w-5 h-5" />
                  <span>Video</span>
                </button>
              </div>

              {/* Camera/Video Preview */}
              <div className="relative mb-4">
                <video ref={videoRef} className="w-full h-64 bg-black rounded-lg" autoPlay muted />
                <canvas ref={canvasRef} className="hidden" />
                {recording && (
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-2 py-1 rounded text-sm flex items-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>REC</span>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex flex-wrap gap-3 mb-4">
                <button onClick={startCamera} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                  Start Camera
                </button>
                <button onClick={stopCamera} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
                  Stop Camera
                </button>
                {captureMode === 'photo' ? (
                  <button onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    Capture Photo
                  </button>
                ) : (
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className={`px-4 py-2 rounded-lg text-white ${recording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {recording ? 'Stop Recording' : 'Start Recording'}
                  </button>
                )}
              </div>

              {/* Drag & Drop Upload */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Supports images and videos up to 200MB
                </p>
              </div>

              {/* File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {uploading && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Uploading...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Media Gallery */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Media</h2>

                {/* Search and Filters */}
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {filteredMedia.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No media found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchTerm || selectedFolder !== 'all' ? 'Try adjusting your search or filters' : 'Start by capturing or uploading some media'}
                  </p>
                </div>
              ) : (
                <div className={viewMode === 'grid'
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  : "space-y-4"
                }>
                  {filteredMedia.map((item) => (
                    <div key={item.id} className={`relative group ${viewMode === 'list' ? 'flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg' : ''}`}>
                      {viewMode === 'grid' ? (
                        <>
                          {item.type.startsWith('image/') ? (
                            <img
                              src={item.signedUrl}
                              alt={item.name}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          ) : (
                            <video
                              src={item.signedUrl}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          )}

                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => window.open(item.signedUrl, '_blank')}
                                className="p-2 bg-white rounded-full hover:bg-gray-100"
                                title="View"
                              >
                                <Download className="w-4 h-4 text-gray-800" />
                              </button>
                              <button
                                onClick={() => shareMedia(item.id)}
                                className="p-2 bg-white rounded-full hover:bg-gray-100"
                                title="Share"
                              >
                                <Share2 className="w-4 h-4 text-gray-800" />
                              </button>
                              <button
                                onClick={() => deleteMedia(item.id)}
                                className="p-2 bg-red-600 rounded-full hover:bg-red-700"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 flex-shrink-0">
                            {item.type.startsWith('image/') ? (
                              <img
                                src={item.signedUrl}
                                alt={item.name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                                <Video className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatBytes(item.size)} • {new Date(item.uploadedAt).toLocaleDateString()}
                            </p>
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => window.open(item.signedUrl, '_blank')}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => shareMedia(item.id)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                              title="Share"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteMedia(item.id)}
                              className="p-2 text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}

                      {viewMode === 'grid' && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{formatBytes(item.size)}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Upgrade to Premium</h3>
            <div className="space-y-4 mb-6">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white">Premium Plan</span>
                  <span className="text-2xl font-bold text-blue-600">$5/month</span>
                </div>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 10GB storage space</li>
                  <li>• Unlimited uploads</li>
                  <li>• Advanced media management</li>
                  <li>• Priority support</li>
                  <li>• Folder organization</li>
                  <li>• Tagging system</li>
                </ul>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => initiatePayment('NGN')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Pay ₦2,300 (NGN)
              </button>
              <button
                onClick={() => initiatePayment('USD')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Pay $5 (USD)
              </button>
            </div>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full mt-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            />
            <div className="flex space-x-3">
              <button
                onClick={createFolder}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateFolder(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Share Media</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Link expires in:
              </label>
              <select
                value={shareExpires}
                onChange={(e) => setShareExpires(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={1}>1 hour</option>
                <option value={24}>24 hours</option>
                <option value={168}>1 week</option>
                <option value={720}>30 days</option>
              </select>
            </div>
            {shareUrl && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Share Link:
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;