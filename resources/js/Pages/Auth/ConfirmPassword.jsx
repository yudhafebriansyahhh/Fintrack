import Icon from '@/Components/Icon';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Confirm Password" />

            <div className="mb-8">
                <p className="text-sm font-semibold uppercase text-primary-600">
                    Secure area
                </p>
                <h1 className="mt-3 text-4xl font-semibold text-slate-950">
                    Konfirmasi dulu. Data finansial layak dijaga.
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-600">
                    Masukkan password untuk melanjutkan tindakan sensitif.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <label htmlFor="password" className="text-sm font-semibold text-slate-900">
                        Password
                    </label>
                    <div className="relative mt-3">
                        <Icon name="lock" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="block h-14 w-full rounded-none border-slate-200 bg-slate-50 pl-12 text-base shadow-sm transition focus:bg-white"
                            isFocused={true}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                    </div>
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <PrimaryButton
                    className="h-14 w-full justify-center rounded-md text-base normal-case shadow-lg shadow-primary-700/25"
                    disabled={processing}
                >
                    Confirm
                </PrimaryButton>
            </form>
        </GuestLayout>
    );
}
