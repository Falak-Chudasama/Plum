import { Toaster } from "sonner";
import "./globals.css"; // Ensure you have your css imported!

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head />
            <body>
                {/* 1. Render the actual app content */}
                <main>{children}</main>

                {/* 2. Render the Toast Manager on top */}
                <Toaster position="top-right" toastOptions={{ style: { zIndex: 9999 } }} />
            </body>
        </html>
    );
}