import { Component } from 'react';

/**
 * Penjaga agar kesalahan tak terduga tidak menghasilkan layar putih.
 * Menyediakan dua jalan keluar: muat ulang, atau kembali ke Menu (`#menu`).
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Jejak lengkap dibiarkan di konsol: pemain hanya perlu tahu apa yang harus dilakukan.
    console.error('Gravity Slash error:', error, info);
  }

  handleReload = () => {
    window.location.hash = '';
    window.location.reload();
  };

  handleBackToMenu = () => {
    window.location.hash = '#menu';
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="screen">
        <div className="screen__content" role="alert">
          <p className="kicker">Terjadi kesalahan</p>
          <h1>Game berhenti tak terduga</h1>
          <p className="muted">
            Ada bagian yang gagal dimuat. Coba muat ulang; kalau tetap gagal, kembali ke menu
            utama.
          </p>
          <p className="small muted">
            Pesan teknis: <code>{String(error?.message ?? error)}</code>
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--primary" onClick={this.handleReload}>
              Muat ulang
            </button>
            <button type="button" className="btn" onClick={this.handleBackToMenu}>
              Kembali ke menu
            </button>
          </div>
        </div>
      </div>
    );
  }
}
