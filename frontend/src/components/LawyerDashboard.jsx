import React from 'react';
import DashboardLayout from './lawyer/DashboardLayout';

export default function LawyerDashboard({ user, onLogout, onUpdateUser }) {
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      onUpdateUser={onUpdateUser}
    />
  );
}
