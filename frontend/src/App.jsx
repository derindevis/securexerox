import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/common/Navbar';
import ToastContainer from './components/common/Toast';
import AppRoutes from './routes/AppRoutes';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="min-h-[100dvh] bg-[var(--canvas)]">
          <Navbar />
          <ToastContainer />
          <AppRoutes />
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
