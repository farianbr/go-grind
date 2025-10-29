import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import ActiveStreamBanner from "./ActiveStreamBanner";

const Layout = ({ children, showSidebar = false }) => {
  return (
    <div className="min-h-screen flex">
      {showSidebar && <Sidebar />}

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 overflow-y-auto">{children}</main>
        
        {/* Show active stream banner when user is in a stream but not on stream page */}
        <ActiveStreamBanner />
      </div>
    </div>
  );
};
export default Layout;
