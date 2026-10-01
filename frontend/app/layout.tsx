import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";
import { AuthProvider } from "@/components/auth-provider";
import { Navbar } from "@/components/navbar";
import { TitleBar } from "@/components/title-bar";
import { ScrollToTop } from "@/components/scroll-to-top";
import { WatchHistoryMigration } from "@/components/watch-history-migration";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Aniways - Anime Streaming",
    template: "%s",
  },
  description: "Stream your favorite anime series and movies for free.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.min.css"
        />
      </head>
      <body
        className="antialiased min-h-screen dotted-bg overflow-hidden"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LanguageProvider>
              <WatchHistoryMigration />
              <TitleBar />
              <div className="h-screen flex flex-col electron-app">
                <div className="flex-1 overflow-y-auto">
                  <Navbar />
                  <main className="container mx-auto px-4">{children}</main>
                  <footer className="border-t border-border/50 mt-auto py-2">
                    <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                      <div className="flex justify-center mt-2">
                        <span className="text-xl text-logo font-black m-2">
                          Aniways
                        </span>
                      </div>
                      <p>Copyright ©Aniways. All Rights Reserved</p>
                      <p className="mt-1">
                        This site does not store any files on its server. All
                        contents are provided by non-affiliated third parties.
                      </p>
                      <div className="flex justify-center mt-3 mb-5">
                        <a
                          href="https://github.com/hazavi/aniways"
                          target="_blank"
                          title="Github Repo"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <i className="devicon-github-original text-3xl"></i>
                        </a>
                      </div>
                    </div>
                  </footer>
                </div>
              </div>
              <ScrollToTop />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
