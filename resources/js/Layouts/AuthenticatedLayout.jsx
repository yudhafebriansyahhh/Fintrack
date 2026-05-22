import ApplicationLogo from '@/Components/ApplicationLogo';
import Icon from '@/Components/Icon';
import { toastError, toastSuccess } from '@/Utils/swal';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const { auth, flash } = usePage().props;
    const user = auth.user;
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const lastFlash = useRef({ success: null, error: null });

    useEffect(() => {
        if (flash?.success && flash.success !== lastFlash.current.success) {
            toastSuccess(flash.success);
            lastFlash.current.success = flash.success;
        }
        if (flash?.error && flash.error !== lastFlash.current.error) {
            toastError(flash.error);
            lastFlash.current.error = flash.error;
        }
    }, [flash?.success, flash?.error]);

    const navItems = [
        { label: 'Dashboard', icon: 'dashboard', routeName: 'dashboard' },
        { label: 'Dompet', icon: 'wallet', routeName: 'wallets.index' },
        { label: 'Kategori', icon: 'filter', routeName: 'categories.index' },
        { label: 'Transaksi', icon: 'transactions', routeName: 'transactions.index' },
        { label: 'Tagihan', icon: 'bills', routeName: 'bills.index' },
        { label: 'Telegram', icon: 'telegram', routeName: 'telegram.index' },
        { label: 'Laporan', icon: 'reports', routeName: 'reports.index' },
        { label: 'Settings', icon: 'settings', routeName: 'settings.index' },
    ];

    const initials = user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const NavItem = ({ item, mobile = false, onClick }) => {
        const active = route().current(item.routeName);

        return (
            <Link
                href={route(item.routeName)}
                onClick={onClick}
                className={
                    mobile
                        ? `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                              active
                                  ? 'bg-primary-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:bg-primary-50 hover:text-primary-700'
                          }`
                        : `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                              active
                                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30'
                                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
                          }`
                }
            >
                <Icon name={item.icon} className={`h-5 w-5 ${active ? '' : 'transition group-hover:scale-110'}`} />
                <span>{item.label}</span>
            </Link>
        );
    };

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#f5f7fb] text-slate-950">
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-dark text-white shadow-2xl shadow-slate-950/20 lg:flex">
                <div className="flex h-20 items-center gap-3 px-6">
                    <ApplicationLogo variant="large" className="h-12 w-auto max-w-36 shrink-0" />
                    <div>
                        <p className="text-lg font-semibold leading-tight">FinTrack</p>
                        <p className="text-xs text-slate-400">Personal Finance</p>
                    </div>
                </div>

                <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
                    {navItems.map((item) => (
                        <NavItem key={item.routeName} item={item} />
                    ))}
                </nav>

                <div className="border-t border-white/10 p-4">
                    <Link
                        href={route('transactions.index')}
                        className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-900/30 transition hover:-translate-y-0.5 hover:bg-primary-500"
                    >
                        <Icon name="plus" className="h-5 w-5" />
                        Tambah Transaksi
                    </Link>

                    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold">Cashflow aman?</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                            Pantau tagihan sebelum jatuh tempo dan jaga saldo tetap tenang.
                        </p>
                    </div>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                    >
                        <Icon name="logout" className="h-5 w-5" />
                        Log Out
                    </Link>
                </div>
            </aside>

            <div className="min-w-0 lg:pl-72">
                <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
                    <div className="flex h-14 min-w-0 items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
                        <button
                            type="button"
                            onClick={() => setShowingNavigationDropdown((value) => !value)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-primary-200 hover:text-primary-700 lg:hidden"
                            aria-label="Toggle navigation"
                        >
                            <Icon name={showingNavigationDropdown ? 'x' : 'menu'} className="h-5 w-5" />
                        </button>

                        <Link href="/" className="flex min-w-0 items-center gap-2 lg:hidden">
                            <ApplicationLogo className="h-10 w-10" />
                            <span className="truncate font-semibold text-primary-700">FinTrack</span>
                        </Link>

                        <div className="ml-auto hidden w-full max-w-sm items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-slate-500 transition focus-within:border-primary-300 focus-within:bg-white sm:flex">
                            <Icon name="search" className="h-5 w-5" />
                            <input
                                className="w-full border-0 bg-transparent p-0 text-sm text-slate-700 placeholder:text-slate-400 focus:ring-0"
                                placeholder="Cari transaksi, tagihan..."
                                type="search"
                            />
                        </div>

                        <button
                            type="button"
                            className="hidden h-10 w-10 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-primary-700 sm:inline-flex"
                            aria-label="Notifikasi"
                        >
                            <Icon name="bell" className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            className="hidden h-10 w-10 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-primary-700 sm:inline-flex"
                            aria-label="Bantuan"
                        >
                            <Icon name="help" className="h-5 w-5" />
                        </button>


                        <Link
                            href={route('profile.edit')}
                            className="ml-auto flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 text-left transition hover:border-primary-200 hover:shadow-sm sm:ml-0 sm:gap-3 sm:rounded-md sm:px-3"
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                                {initials}
                            </span>
                            <span className="hidden min-w-0 sm:block">
                                <span className="block max-w-36 truncate text-sm font-semibold text-slate-900 xl:max-w-48">{user.name}</span>
                                <span className="block max-w-36 truncate text-xs text-slate-500 xl:max-w-48">{user.email}</span>
                            </span>
                        </Link>
                    </div>

                </header>

                <div
                    className={`fixed inset-0 z-40 lg:hidden ${
                        showingNavigationDropdown ? 'pointer-events-auto' : 'pointer-events-none'
                    }`}
                    aria-hidden={!showingNavigationDropdown}
                >
                    <button
                        type="button"
                        onClick={() => setShowingNavigationDropdown(false)}
                        className={`absolute inset-0 bg-slate-950/45 backdrop-blur-sm transition-opacity duration-300 ${
                            showingNavigationDropdown ? 'opacity-100' : 'opacity-0'
                        }`}
                        aria-label="Tutup navigasi"
                    />

                    <aside
                        className={`absolute inset-y-0 left-0 flex w-[min(84vw,20rem)] flex-col bg-white shadow-2xl shadow-slate-950/30 transition-transform duration-300 ease-out ${
                            showingNavigationDropdown ? 'translate-x-0' : '-translate-x-full'
                        }`}
                    >
                        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
                            <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setShowingNavigationDropdown(false)}>
                                <ApplicationLogo variant="large" className="h-10 w-auto max-w-32" />
                            </Link>
                            <button
                                type="button"
                                onClick={() => setShowingNavigationDropdown(false)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                aria-label="Tutup navigasi"
                            >
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>

                        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4 scrollbar-thin">
                            {navItems.map((item) => (
                                <NavItem
                                    key={item.routeName}
                                    item={item}
                                    mobile
                                    onClick={() => setShowingNavigationDropdown(false)}
                                />
                            ))}
                        </nav>

                        <div className="border-t border-slate-200 p-4">
                            <Link
                                href={route('transactions.index')}
                                onClick={() => setShowingNavigationDropdown(false)}
                                className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
                            >
                                <Icon name="plus" className="h-5 w-5" />
                                Tambah Transaksi
                            </Link>

                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-rose-100"
                            >
                                <Icon name="logout" className="h-5 w-5" />
                                Logout
                            </Link>
                        </div>
                    </aside>
                </div>

                {header && (
                    <section className="border-b border-slate-200 bg-white">
                        <div className="min-w-0 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">{header}</div>
                    </section>
                )}

                <main className="min-w-0 animate-in">{children}</main>
            </div>
        </div>
    );
}
