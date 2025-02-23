import { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { Store, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const login = useAuthStore((state) => state.login);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await login(email, password);
		} catch (error) {
			toast.error('Credenciales inválidas');
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-fuchsia-50 pb-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					{/* <Store className="mx-auto h-16 w-16 text-pink-600" /> */}
                    {/* <img src="/logo-jsl.png" alt="" /> */}
					<h2 className="mt-6 text-center font-extrabold">
						<Store className="mx-auto h-16 w-16 text-pink-400" />
						<p className='text-7xl text-pink-500'>LIS</p>
						<p className='text-9xl text-pink-500'>JSL</p>
					</h2>
					<p className="mt-2 text-center text-lg font-medium text-gray-600">Gestión de Ventas e Inventarios</p>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div className="rounded-md shadow-sm -space-y-px">
						<div>
							<label htmlFor="email-address" className="sr-only">
								Correo electrónico
							</label>
							<input
								id="email-address"
								name="email"
								type="email"
								autoComplete="email"
								required
								className="appearance-none rounded-none relative block w-full px-3 py-2 border border-pink-300 placeholder-pink-300 text-gray-900 font-medium rounded-t-md focus:outline-none focus:ring-pink-500 focus:border-pink-500 focus:z-10 sm:text-sm"
								placeholder="Correo electrónico"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div>
							<label htmlFor="password" className="sr-only">
								Contraseña
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								required
								className="appearance-none rounded-none relative block w-full px-3 py-2 border border-pink-300 placeholder-pink-300 text-gray-900 font-medium rounded-b-md focus:outline-none focus:ring-pink-500 focus:border-pink-500 focus:z-10 sm:text-sm"
								placeholder="Contraseña"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
					</div>

					<div>
						<button
							type="submit"
							className="group relative w-full flex justify-center items-center gap-1.5 py-2 px-4 border border-transparent text-xl font-bold rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
						>
							<KeyRound className="h-5 w-5 text-white" />
							Ingresar
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
