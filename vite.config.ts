import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
			manifest: {
                id: '/',
				name: 'LIS JSL - Sistema de Inventario',
				short_name: 'LIS JSL',
				description: 'Sistema de Gestión de Inventarios LIS JSL',
				theme_color: '#4f46e5',
				background_color: '#ffffff',
				display: 'standalone',
				icons: [
					{
						src: '/pwa-64x64.png',
						sizes: '64x64',
						type: 'image/png',
					},
					{
						src: '/pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: '/pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any',
					},
					{
						src: '/maskable-icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable',
					},
				],
                screenshots: [
                    {
                      src: '/screenshot-01.png',
                      sizes: '1414x995',
                      type: 'image/png',
                      form_factor: 'wide', // Especifica si es "wide" o "narrow"
                    },
                    {
                      src: '/screenshot-02.png',
                      sizes: '358x744',
                      type: 'image/png',
                    },
                  ],
			},
			workbox: {
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/mggdwlrpjfpwdfdotdln\.supabase\.co\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'supabase-cache',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24 * 7, // 1 semana
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
					{
						urlPattern: /\.(js|css|png|jpg|jpeg|svg|gif)$/,
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'assets-cache',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
							},
						},
					},
				],
			},
		}),
	],
	// optimizeDeps: {
	//   exclude: ['lucide-react'],
	// },
});
