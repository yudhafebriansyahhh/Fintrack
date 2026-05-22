import Icon from '@/Components/Icon';
import PrimaryButton from '@/Components/PrimaryButton';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Email Verification" />

            <div className="mb-8">
                <p className="text-sm font-semibold uppercase text-primary-600">
                    Verify email
                </p>
                <h1 className="mt-3 text-4xl font-semibold text-slate-950">
                    Satu klik lagi sebelum dashboard terbuka.
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-600">
                    Cek email Anda untuk tautan verifikasi. Belum masuk? Kirim ulang dari sini.
                </p>
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-6 rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-success">
                    Link verifikasi baru sudah dikirim.
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <PrimaryButton
                    className="h-14 w-full justify-center rounded-md text-base normal-case shadow-lg shadow-primary-700/25"
                    disabled={processing}
                >
                    <Icon name="mail" className="mr-2 h-5 w-5" />
                    Kirim Ulang Verifikasi
                </PrimaryButton>

                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="block w-full rounded-md px-4 py-3 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                >
                    Log Out
                </Link>
            </form>
        </GuestLayout>
    );
}
