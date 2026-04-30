import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Download, Share2, Eye } from 'lucide-react';
import { API_BASE } from '../config/api';

function SharedMedia() {
  const { token } = useParams();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSharedMedia();
  }, [token]);

  const loadSharedMedia = async () => {
    try {
      const res = await axios.get(`${API_BASE}/media/shared/${token}`);
      setMedia(res.data.media);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load shared media');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = () => {
    if (!media) return;
    const link = document.createElement('a');
    link.href = media.signedUrl;
    link.download = media.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading shared media...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-red-600 dark:text-red-400 text-xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Unable to Load Media</h2>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    </div>
  );

  if (!media) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shared Media</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{media.name}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={downloadFile}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            {media.type.startsWith('image/') ? (
              <img
                src={media.signedUrl}
                alt={media.name}
                className="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
              />
            ) : media.type.startsWith('video/') ? (
              <video
                src={media.signedUrl}
                controls
                className="max-w-full max-h-96 rounded-lg shadow-lg"
              />
            ) : (
              <div className="text-center py-12">
                <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  This file type cannot be previewed directly.
                </p>
                <button
                  onClick={downloadFile}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Download File
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Size:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatBytes(media.size)}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Type:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {media.type}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Uploaded:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(media.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            {media.originalSize && media.originalSize !== media.size && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Saved:</span>
                <p className="font-medium text-green-600 dark:text-green-400">
                  {formatBytes(media.originalSize - media.size)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default SharedMedia;