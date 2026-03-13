import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
      {/* Header */}
      <header className="border-b-2 border-foreground">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Quizo</h1>
            <p className="font-mono text-sm mt-1 uppercase tracking-widest text-muted-foreground">Secure Exam Environment</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/student"
              className="px-6 py-2 border-2 border-foreground hover:bg-foreground hover:text-background transition-colors font-bold uppercase tracking-wider text-sm"
            >
              Student Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-7xl font-black mb-8 uppercase tracking-tighter text-balance">
            Academic Assessment <br/> Protocol
          </h2>
          <p className="text-xl md:text-2xl font-mono mb-12 max-w-3xl mx-auto text-muted-foreground">
            A high-integrity testing platform. Strict anti-cheating measures. Automated enforcement. 
          </p>

          <div className="flex justify-center gap-6">
            <Link
              href="/student"
              className="px-10 py-4 bg-foreground text-background font-black uppercase tracking-widest text-lg hover:opacity-90 transition-opacity"
            >
              Enter Portal
            </Link>
          </div>
        </div>

        {/* Features Minimalist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-foreground mb-24">
          <div className="p-8 border-b-2 md:border-b-0 md:border-r-2 border-foreground group hover:bg-foreground hover:text-background transition-colors">
            <div className="text-4xl mb-6 font-mono">01</div>
            <h3 className="font-black text-xl mb-3 uppercase tracking-wider">Zero Tolerance</h3>
            <p className="opacity-80 font-mono text-sm leading-relaxed">
              Immediate termination upon exiting fullscreen, modifying windows, or suspicious keystrokes.
            </p>
          </div>

          <div className="p-8 border-b-2 md:border-b-0 md:border-r-2 border-foreground group hover:bg-foreground hover:text-background transition-colors">
            <div className="text-4xl mb-6 font-mono">02</div>
            <h3 className="font-black text-xl mb-3 uppercase tracking-wider">Auto-Grading</h3>
            <p className="opacity-80 font-mono text-sm leading-relaxed">
              Instantaneous scoring for objective formats. Streamlined manual review for written responses.
            </p>
          </div>

          <div className="p-8 group hover:bg-foreground hover:text-background transition-colors">
            <div className="text-4xl mb-6 font-mono">03</div>
            <h3 className="font-black text-xl mb-3 uppercase tracking-wider">State Recovery</h3>
            <p className="opacity-80 font-mono text-sm leading-relaxed">
              Continuous 5-second persistence protocol ensures terminal progress is never lost.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="border-t-2 border-foreground pt-16 mb-24">
          <div className="max-w-3xl mx-auto">
            <div className="mb-12">
              <h3 className="text-3xl font-black mb-8 uppercase tracking-widest">
                Examinee Protocol
              </h3>
              <ol className="space-y-6 font-mono text-base">
                <li className="flex gap-6 items-start">
                  <span className="font-black text-xl w-8">1.</span>
                  <span className="pt-1">Access the student portal and input assigned identification (Roll Number).</span>
                </li>
                <li className="flex gap-6 items-start">
                  <span className="font-black text-xl w-8">2.</span>
                  <span className="pt-1">Select the designated assessment from the active index.</span>
                </li>
                <li className="flex gap-6 items-start">
                  <span className="font-black text-xl w-8">3.</span>
                  <span className="pt-1">Authorize fullscreen terminal mode. Environment will be locked.</span>
                </li>
                <li className="flex gap-6 items-start">
                  <span className="font-black text-xl w-8">4.</span>
                  <span className="pt-1">Complete assessment within parameters and systematically submit.</span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="max-w-2xl mx-auto text-center border-2 border-foreground p-12 bg-card">
          <h3 className="text-2xl font-black mb-4 uppercase tracking-wider">Candidate Login</h3>
          <p className="font-mono text-muted-foreground mb-8">
            Access secure testing environment.
          </p>
          <Link
            href="/student"
            className="inline-block px-8 py-4 bg-foreground text-background font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Authenticate →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-foreground bg-foreground text-background py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm font-mono uppercase tracking-widest mb-12">
            <p className="mb-4 md:mb-0">Quizo // Secure Assessment Framework</p>
            <Link href="/README_QUIZ.md" className="hover:underline">
              Documentation
            </Link>
          </div>
          
          <div className="pt-12 border-t border-background/10">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] mb-4 opacity-40">Development Protocol</p>
            <p className="font-mono text-xs uppercase tracking-[0.2em] leading-relaxed">
              Made by Muhammad Haris Zubair [CS Dept] <br className="md:hidden" />
              <span className="hidden md:inline mx-4 opacity-30">//</span>
              Noor-ul-Haseeb [AI Dept]
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
