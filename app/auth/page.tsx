'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const createDevUser = async () => {
    setLoading(true);
    try {
      // 有効なドメイン形式で開発用ユーザー作成
      const { data, error } = await supabase.auth.signUp({
        email: `dev${Date.now()}@gmail.com`,
        password: 'dev123456',
      });
      
      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage(`Success! User ID: ${data.user?.id}`);
        setTimeout(() => router.push('/board'), 1000);
      }
    } catch (err) {
      setMessage(`Unexpected error: ${err}`);
    }
    setLoading(false);
  };

  const checkSession = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      setMessage(`Already logged in: ${data.session.user.id}`);
    } else {
      setMessage('No active session');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMessage('Signed out');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Development Auth</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={createDevUser} 
          disabled={loading}
          style={{ 
            padding: '12px 24px', 
            marginRight: '10px',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'default' : 'pointer'
          }}
        >
          {loading ? 'Creating user...' : 'Create Dev User'}
        </button>
        
        <button 
          onClick={checkSession} 
          style={{ 
            padding: '12px 24px', 
            marginRight: '10px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Check Session
        </button>
        
        <button 
          onClick={signOut}
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>
      
      {message && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: message.includes('Error') ? '#ffebee' : '#e8f5e8',
          border: `1px solid ${message.includes('Error') ? '#f44336' : '#4caf50'}`,
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {message}
        </div>
      )}
      
      <div style={{ 
        marginTop: '20px', 
        fontSize: '14px', 
        color: '#666',
        padding: '12px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px'
      }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Click "Create Dev User" to generate a temporary user</li>
          <li>After success, you'll be redirected to /board</li>
          <li>Then you can test the Archive API with proper authentication</li>
        </ol>
      </div>
    </div>
  );
}