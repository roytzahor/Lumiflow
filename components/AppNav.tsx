import BottomNav from "./BottomNav";
import DesktopSidebar from "./DesktopSidebar";

/** Main app navigation: bottom tab bar below lg, fixed start-side sidebar at lg+. */
export default function AppNav() {
    return (
        <>
            <DesktopSidebar />
            <BottomNav />
        </>
    );
}
