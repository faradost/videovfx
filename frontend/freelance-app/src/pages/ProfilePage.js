import React from 'react';
import { useAuth } from '../contexts/AuthContext';

function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading profile...</div>;
  }

  if (!user) {
    // This case should ideally be handled by a protected route redirecting to login
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>My Profile</h2>
      <p><strong>Full Name:</strong> {user.full_name}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Username:</strong> {user.username}</p>
      <p><strong>User Type:</strong> {user.user_type}</p>
      {/* Add more profile information here as it becomes available in the user object */}
      {user.user_type === 'freelancer' && (
        <>
          <p><strong>Skills:</strong> {user.skills || 'Not set'}</p>
          <p><strong>Bio:</strong> {user.bio || 'Not set'}</p>
        </>
      )}
       {/* TODO: Add edit profile functionality */}
    </div>
  );
}

export default ProfilePage;
