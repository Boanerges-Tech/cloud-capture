import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { API_BASE } from '../config/api';

function PaymentCallback({ user, setUser }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'failed'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (reference) {
      verifyPayment(reference);
    } else {
      setStatus('failed');
      setMessage('No payment reference found');
    }
  }, [searchParams]);

  const verifyPayment = async (reference) => {
    try {
      const res = await axios.post(`${API_BASE}/payments/verify/${reference}`);
      setStatus('success');
      setMessage('Payment successful! Your premium subscription is now active.');

      // Update user data
      const userRes = await axios.get(`${API_BASE}/auth/me`);
      setUser(userRes.data.user);

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      setStatus('failed');
      setMessage(error.response?.data?.message || 'Payment verification failed');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return <Loader className="w-16 h-16 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-600" />;
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'verifying':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          {getStatusIcon()}
        </div>

        <h1 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
          {status === 'verifying' && 'Verifying Payment'}
          {status === 'success' && 'Payment Successful!'}
          {status === 'failed' && 'Payment Failed'}
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>

        {status === 'success' && (
          <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              Premium Features Unlocked!
            </h3>
            <ul className="text-sm text-green-700 dark:text-green-300 text-left space-y-1">
              <li>• 10GB storage space</li>
              <li>• Unlimited uploads</li>
              <li>• Advanced media management</li>
              <li>• Priority support</li>
            </ul>
          </div>
        )}

        <div className="space-y-3">
          {status === 'failed' && (
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className={`w-full font-semibold py-2 px-4 rounded-lg transition-colors ${
              status === 'success'
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {status === 'verifying' ? 'Please wait...' : 'Go to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentCallback;