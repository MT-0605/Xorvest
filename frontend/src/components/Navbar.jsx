import React from 'react';

export default function Navbar() {
  return (
    <header className="w-full border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center space-x-3">
          <img
            src="/xorvest-logo.png"
            alt="XorVest Logo - Logic Meets Profit"
            className="h-11 sm:h-12 w-auto object-contain hover:brightness-110 transition duration-300"
          />
          <div className="hidden sm:flex flex-col border-l border-zinc-800 pl-3">
            <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
              Financial Tech
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">
              Smart Lending Solutions
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
