import { useState, useRef, useEffect, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router'
import { SocialIconsDisplay } from './SocialIconsDisplay'
import { useSocialLinks } from './SocialLinksProvider'

export function Layout({ children }: { children: React.ReactNode }) {
 const [mobileOpen, setMobileOpen] = useState(false)
 const [darkMode, setDarkMode] = useState(false)
 const [scrolled, setScrolled] = useState(false)
 const tickingRef = useRef(false)
 const drawerRef = useRef<HTMLElement>(null)
 const hamburgerRef = useRef<HTMLButtonElement>(null)
 const { links: socialLinks, loading: socialLoading } = useSocialLinks()

 useEffect(() => {
 try {
 const saved = localStorage.getItem('dark-mode');
 if (saved !== null) {
 setDarkMode(JSON.parse(saved));
 } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
 setDarkMode(true);
 }
 } catch {}
 }, []);
 const location = useLocation()

 // Scroll to top on navigation
 useEffect(() => {
 window.scrollTo({ top: 0, behavior: "instant" })
 }, [location.pathname])

 // Apply dark mode class to html element
 useEffect(() => {
 if (darkMode) {
 document.documentElement.classList.add('dark')
 } else {
 document.documentElement.classList.remove('dark')
 }
 localStorage.setItem('dark-mode', JSON.stringify(darkMode))
 }, [darkMode])

 	// Navbar scroll effect
	useEffect(() => {
		let isScrolled = false;
		const onScroll = () => {
			if (tickingRef.current) return;
			tickingRef.current = true;
			requestAnimationFrame(() => {
				const nowScrolled = window.scrollY > 20;
				if (nowScrolled !== isScrolled) {
					isScrolled = nowScrolled;
					setScrolled(nowScrolled);
				}
				tickingRef.current = false;
			});
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

 // Close mobile nav on route change
 useEffect(() => {
 window.scrollTo({ top: 0, behavior: "instant" })
		setMobileOpen(false)
 }, [location])

 // Close on Escape key
 useEffect(() => {
 function handleKeyDown(e: KeyboardEvent) {
 if (e.key === 'Escape') {
 window.scrollTo({ top: 0, behavior: "instant" })
		setMobileOpen(false)
 }
 }
 if (mobileOpen) {
 document.addEventListener('keydown', handleKeyDown)
 return () => document.removeEventListener('keydown', handleKeyDown)
 }
 }, [mobileOpen])

 // Lock body scroll when menu open
 useEffect(() => {
 if (mobileOpen) {
 document.body.style.overflow = 'hidden'
 } else {
 document.body.style.overflow = ''
 }
 return () => {
 document.body.style.overflow = ''
 }
 }, [mobileOpen])

 // Restore focus to hamburger button when drawer closes
 useEffect(() => {
 if (!mobileOpen) {
 // Small delay to let the transition start
 const timer = setTimeout(() => {
 if (hamburgerRef.current) {
 hamburgerRef.current.focus()
 }
 }, 100)
 return () => clearTimeout(timer)
 }
 }, [mobileOpen])

 // Trap focus inside the drawer when open
 useEffect(() => {
 if (!mobileOpen || !drawerRef.current) return

 const drawer = drawerRef.current
 const focusableSelector =
 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

 const handleTab = (e: KeyboardEvent) => {
 if (e.key !== 'Tab') return
 const focusable = Array.from(
 drawer.querySelectorAll<HTMLElement>(focusableSelector)
 )
 if (focusable.length === 0) return
 const first = focusable[0]
 const last = focusable[focusable.length - 1]
 if (e.shiftKey) {
 if (document.activeElement === first) {
 e.preventDefault()
 last.focus()
 }
 } else {
 if (document.activeElement === last) {
 e.preventDefault()
 first.focus()
 }
 }
 }

 // Focus first item in drawer on open
 const focusable = Array.from(
 drawer.querySelectorAll<HTMLElement>(focusableSelector)
 )
 if (focusable.length > 0) {
 focusable[0].focus()
 }

 document.addEventListener('keydown', handleTab)
 return () => document.removeEventListener('keydown', handleTab)
 }, [mobileOpen])

 // Mark main content as inert when drawer is open (accessibility)
 useEffect(() => {
 const mainEl = document.getElementById('main-content')
 if (!mainEl) return
 if (mobileOpen) {
 mainEl.setAttribute('inert', '')
 mainEl.setAttribute('aria-hidden', 'true')
 } else {
 mainEl.removeAttribute('inert')
 mainEl.removeAttribute('aria-hidden')
 }
 return () => {
 mainEl.removeAttribute('inert')
 mainEl.removeAttribute('aria-hidden')
 }
 }, [mobileOpen])

 const toggleMobile = useCallback(() => {
 setMobileOpen((prev) => !prev)
 }, [])

 const toggleTheme = useCallback(() => {
 setDarkMode((prev: boolean) => !prev)
 }, [])

 return (
 <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
 {/* Skip to main content link for accessibility */}
 <a
 href="#main-content"
 className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
 >
 Skip to main content
 </a>

 <header
 className={`fixed top-0 z-50 w-full backdrop-blur-xl bg-background/80 dark:bg-background/80 border-b transition-colors duration-200 ${
 scrolled ? 'navbar-scrolled border-border/50 bg-background/95' : 'border-transparent'
 }`}
 >
 <div className="mx-auto max-w-7xl px-4 sm:px-6">
 <nav className="flex items-center h-14">
 {/* Left - Logo */}
 <div className="pl-2 flex items-center">
 <NavLink
 to="/"
 className="flex items-center gap-3 font-bold text-foreground tracking-tight text-[16px] hover:opacity-70 transition-opacity cursor-pointer"
 aria-label="OpusZen home"
 >
 <img
 src="/logo.png"
 alt="OpusZen"
 className="w-9 h-9"
 />
 <span>OpusZen</span>
 </NavLink>
 </div>

 {/* Spacer */}
 <div className="flex-1" />

 {/* Center - Desktop Nav */}
 <div className="hidden md:flex items-center gap-1">
 <NavLink
 to="/docs"
 className="nav-link-indicator text-sm font-medium transition-colors text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg px-3 py-2"
 >
 Documentation
 </NavLink>
 <NavLink
 to="/pricing"
 className="nav-link-indicator text-sm font-medium transition-colors text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg px-3 py-2"
 >
 Pricing
 </NavLink>
 <NavLink
 to="/status"
 className="nav-link-indicator text-sm font-medium transition-colors text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg px-3 py-2"
 >
 Status
 </NavLink>
 <NavLink
 to="/key-status"
 className="nav-link-indicator text-sm font-medium transition-colors text-primary font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg px-3 py-2"
 >
 Key Status
 </NavLink>
 <NavLink
 to="/orders"
 className="nav-link-indicator text-sm font-medium transition-colors text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg px-3 py-2"
 >
 Orders
 </NavLink>
 </div>

 {/* Right - Actions */}
 <div className="flex items-center gap-2 pr-2">
 {/* Theme toggle */}
 <button
 onClick={toggleTheme}
 className="relative p-2 rounded-full bg-muted dark:bg-muted/50 hover:bg-muted/80 dark:hover:bg-muted transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background group min-h-11 min-w-11 flex items-center justify-center"
 aria-label="Toggle theme"
 >
 <div className="relative w-5 h-5">
 {/* Sun icon - visible in light mode */}
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className={`absolute inset-0 text-amber-500 transition-all duration-500 ease-in-out ${
 darkMode
 ? 'opacity-0 rotate-90 scale-0'
 : 'opacity-100 rotate-0 scale-100'
 }`}
 aria-hidden="true"
 >
 <circle cx={12} cy={12} r={5} />
 <line x1={12} y1={1} x2={12} y2={3} />
 <line x1={12} y1={21} x2={12} y2={23} />
 <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
 <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
 <line x1={1} y1={12} x2={3} y2={12} />
 <line x1={21} y1={12} x2={23} y2={12} />
 <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
 <line x1="18.36" y1="5.64" x2="19.78" y2="4.24" />
 </svg>

 {/* Moon icon - visible in dark mode */}
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className={`absolute inset-0 text-slate-300 transition-all duration-500 ease-in-out ${
 darkMode
 ? 'opacity-100 rotate-0 scale-100'
 : 'opacity-0 -rotate-90 scale-0'
 }`}
 aria-hidden="true"
 >
 <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
 </svg>
 </div>

 {/* Hover glow */}
 <div className="absolute inset-0 rounded-full bg-primary/20 dark:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md" />
 </button>

 {/* Mobile hamburger */}
 <button
 ref={hamburgerRef}
 className="md:hidden p-2 min-w-11 min-h-11 rounded-full hover:bg-muted dark:hover:bg-muted/50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-center"
 onClick={toggleMobile}
 aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
 aria-expanded={mobileOpen}
 aria-controls="mobile-nav"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={20}
 height={20}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="transition-all duration-200"
 aria-hidden="true"
 >
 {mobileOpen ? (
 <path d="M18 6 6 18" />
 ) : (
 <>
 <path d="M4 6h16" />
 <path d="M4 12h16" />
 <path d="M4 18h16" />
 </>
 )}
 </svg>
 </button>
 </div>
 </nav>
 </div>
 </header>

 {/* Mobile overlay */}
 <div
 className={`fixed inset-0 z-[1200] bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
 mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
 }`}
 onClick={() => { window.scrollTo({ top: 0, behavior: "instant" }); setMobileOpen(false); }}
 aria-hidden="true"
 />

 {/* Mobile slide-out drawer */}
 <aside
 id="mobile-nav"
 ref={drawerRef}
 className={`fixed top-0 right-0 z-[1300] h-full w-[280px] bg-background dark:bg-background/98 border-l border-border shadow-2xl transform transition-transform duration-300 ease-out md:hidden ${
 mobileOpen ? 'translate-x-0' : 'translate-x-full'
 }`}
 role="dialog"
 aria-modal="true"
 aria-label="Mobile navigation"
 >
 {/* Drawer handle bar */}
 <div className="flex justify-center pt-3 pb-2" aria-hidden="true">
 <div className="w-8 h-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80" />
 </div>

 {/* Close button */}
 <div className="flex justify-end px-4">
 <button
 onClick={() => { window.scrollTo({ top: 0, behavior: "instant" }); setMobileOpen(false) }}
 className="p-2 cursor-pointer rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 aria-label="Close navigation menu"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={20}
 height={20}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="h-5 w-5"
 aria-hidden="true"
 >
 <path d="M18 6 6 18" />
 <path d="m6 6 12 12" />
 </svg>
 </button>
 </div>

 {/* Nav links */}
 <nav className="flex flex-col px-4 py-6 gap-1">
 <NavLink
 to="/docs"
 className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium text-foreground hover:bg-primary/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="text-primary"
 aria-hidden="true"
 >
 <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
 </svg>
 Documentation
 </NavLink>
 <NavLink
 to="/pricing"
 className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium text-foreground hover:bg-primary/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="text-primary"
 aria-hidden="true"
 >
 <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
 </svg>
 Pricing
 </NavLink>
 <NavLink
 to="/status"
 className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium text-foreground hover:bg-primary/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="text-primary"
 aria-hidden="true"
 >
 <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
 </svg>
 Status
 </NavLink>

 {/* Divider */}
 <div className="my-2 border-t border-border" aria-hidden="true" />

 <NavLink
 to="/key-status"
 className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="text-white"
 aria-hidden="true"
 >
 <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
 <path d="M7 11V7a5 5 0 0 1 10 0v4" />
 </svg>
 Key Status
 </NavLink>
 <NavLink
 to="/orders"
 className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium text-foreground hover:bg-primary/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="text-primary"
 aria-hidden="true"
 >
 <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
 <path d="M3 6h18" />
 <path d="M16 10a4 4 0 0 1-8 0" />
 </svg>
 Orders
 </NavLink>
 </nav>
 </aside>

 <main id="main-content" className="pt-20" tabIndex={-1}>
 {children}
 </main>

 <footer className="border-t border-border py-10 px-4 mt-16">
 <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
 <div className="flex items-center gap-3">
 <img
 src="/logo.png"
 alt="OpusZen"
 className="w-8 h-8"
 />
 <div>
 <span className="text-sm font-bold text-foreground">OpusZen</span>
 <span className="text-xs text-muted-foreground ml-2">Anthropic-compatible API gateway for Claude</span>
 </div>
 </div>
 <SocialIconsDisplay links={socialLinks} size="sm" variant="ghost" />
 </div>
 <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-border/40">
 <nav className="flex items-center gap-5 text-xs text-muted-foreground" aria-label="Footer navigation">
 <NavLink to="/docs" className="hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">Docs</NavLink>
 <NavLink to="/key-status" className="hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">Key Status</NavLink>
 <NavLink to="/status" className="hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">Status</NavLink>
 <NavLink to="/orders" className="hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">Orders</NavLink>
 <NavLink to="/terms" className="hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">Terms</NavLink>
 <NavLink to="/privacy" className="hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">Privacy</NavLink>
 </nav>
 <p className="text-xs text-muted-foreground">
 &copy; {new Date().getFullYear()} OpusZen. All rights reserved.
 </p>
 </div>
 </footer>
 </div>
 )
}
