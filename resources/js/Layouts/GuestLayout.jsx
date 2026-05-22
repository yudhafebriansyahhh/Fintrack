import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen bg-white text-slate-950">
            <div className="grid min-h-screen lg:grid-cols-[minmax(420px,1fr)_minmax(520px,1fr)]">
                <section className="relative hidden overflow-hidden bg-dark text-white lg:block">
                    <div className="glass-line absolute inset-0 opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/95 to-primary-900/90" />
                    <div className="absolute -right-24 top-32 h-72 w-72 rounded-full bg-primary-600/10 blur-3xl" />
                    <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-slate-950 to-transparent" />

                    <div className="relative z-10 flex min-h-screen flex-col px-10 py-10">
                        <Link href="/" className="flex items-center gap-4">
                            <ApplicationLogo variant="large" className="h-14 w-auto" />
                            <span className="text-3xl font-semibold">
                                FinTrack
                            </span>
                        </Link>

                        <div className="mt-auto max-w-2xl pb-28 animate-in">
                            <p className="text-5xl font-semibold leading-tight">
                                Secure.
                                <br />
                                Stable.
                                <br />
                                Clear.
                            </p>
                            <p className="mt-8 max-w-xl text-xl leading-8 text-slate-300">
                                Uang masuk, tagihan keluar, saldo tetap terkendali. Masuk dan lihat kondisi finansial Anda dalam hitungan detik.
                            </p>
                        </div>

                        <p className="relative z-10 text-sm text-slate-400">
                            (c) 2026 FinTrack Pro. Built for calmer personal finance.
                        </p>
                    </div>
                </section>

                <section className="flex min-h-screen items-center justify-center bg-white px-6 py-10 sm:px-10">
                    <div className="w-full max-w-xl animate-in-delay-1">
                        <div className="mb-10 flex items-center gap-3 lg:hidden">
                            <ApplicationLogo variant="large" className="h-12 w-auto" />
                            <span className="text-2xl font-semibold">
                                FinTrack 
                            </span>
                        </div>
                        {children}
                    </div>
                </section>
            </div>
        </div>
    );
}
