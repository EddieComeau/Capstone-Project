// frontend/src/pages/AdminPage.jsx

import AdminSyncPanel from "../components/AdminSyncPanel";

export default function AdminPage() {
  return (
    <div style={{ padding: 16 }}>
      <h2>Administration</h2>
      <p>From here you can trigger a manual sync of betting data.</p>
      <AdminSyncPanel />
    </div>
  );
}
