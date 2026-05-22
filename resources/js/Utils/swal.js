import Swal from 'sweetalert2/dist/sweetalert2.js';
import 'sweetalert2/dist/sweetalert2.min.css';

const baseConfig = {
    customClass: {
        popup: 'swal2-fintrack-popup',
        title: 'swal2-fintrack-title',
        htmlContainer: 'swal2-fintrack-text',
    },
    buttonsStyling: true,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#64748b',
};

export const confirmDelete = ({
    title = 'Yakin ingin menghapus?',
    text = 'Tindakan ini tidak dapat dibatalkan setelah dikonfirmasi.',
    confirmButtonText = 'Ya, hapus',
    cancelButtonText = 'Batal',
} = {}) =>
    Swal.fire({
        ...baseConfig,
        icon: 'warning',
        title,
        text,
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
    }).then((result) => result.isConfirmed);

export const confirmAction = ({
    title = 'Konfirmasi tindakan',
    text = '',
    confirmButtonText = 'Lanjutkan',
    cancelButtonText = 'Batal',
    icon = 'question',
} = {}) =>
    Swal.fire({
        ...baseConfig,
        icon,
        title,
        text,
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText,
    }).then((result) => result.isConfirmed);

const toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2600,
    timerProgressBar: true,
    customClass: {
        popup: 'swal2-fintrack-toast',
        title: 'swal2-fintrack-toast-title',
    },
});

export const toastSuccess = (message) =>
    toast.fire({ icon: 'success', title: message });

export const toastError = (message) =>
    toast.fire({ icon: 'error', title: message });

export const toastInfo = (message) =>
    toast.fire({ icon: 'info', title: message });

export default Swal;
