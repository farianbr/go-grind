import { useEffect } from "react";
import { useLocation } from "react-router";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import ActiveStreamBanner from "./ActiveStreamBanner";

const Layout = ({ children, showSidebar = false }) => {
  const location = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex flex-1 pt-16">
        {showSidebar && <Sidebar />}

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      
      <ActiveStreamBanner />
    </div>
  );
};
export default Layout;
