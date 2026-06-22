import { supabase } from './supabase';
import { Capacitor } from '@capacitor/core';

export type PaymentMethod = 'orange_money' | 'wave' | 'mtn_money' | 'moov_money' | 'card';

export interface PaymentSessionOptions {
    planId: string;
    amount: number;
    type: 'coins' | 'premium';
    quantity?: number;
    duration?: 'weekly' | 'monthly' | 'annual';
}

export interface PaymentService {
    createCheckoutSession(
        userId: string,
        method: PaymentMethod,
        options: PaymentSessionOptions,
        simulateSuccess: boolean,
        payerNumber?: string
    ): Promise<{ success: boolean; transactionId?: string; error?: string; redirectUrl?: string }>;
}

// ─── SERVICE WEB UNIQUEMENT ─────────────────────────────────────────────────
// Ce service gère les paiements via le site web levelmak.app.
// Sur mobile natif, les paiements ne sont PAS disponibles (conformité Google Play).
class WebPaymentService implements PaymentService {
    async createCheckoutSession(
        userId: string,
        method: PaymentMethod,
        options: PaymentSessionOptions,
        simulateSuccess: boolean,
        payerNumber?: string
    ): Promise<{ success: boolean; transactionId?: string; error?: string; redirectUrl?: string }> {
        // Sur mobile natif : bloquer et rediriger vers le site web
        if (Capacitor.isNativePlatform()) {
            return {
                success: false,
                error: 'Les paiements ne sont pas disponibles dans l\'application mobile. Veuillez vous rendre sur levelmak.app pour gérer votre abonnement.'
            };
        }

        // Sur web : appeler la Supabase Edge Function pour le vrai flux Djomy
        try {
            console.log('PaymentService: Invoking Supabase function djomy-payment for plan:', options.planId);
            
            const { data, error } = await supabase.functions.invoke('djomy-payment', {
                body: {
                    planId: options.planId,
                    amount: options.amount,
                    payerNumber: payerNumber || '',
                    returnUrl: window.location.origin + '/pricing?success=true',
                    duration: options.duration,
                    simulate: simulateSuccess
                }
            });

            if (error) {
                console.error("Supabase function error:", error);
                return { 
                    success: false, 
                    error: error.message || "Erreur de connexion avec la passerelle de paiement." 
                };
            }

            if (!data || !data.success) {
                return { 
                    success: false, 
                    error: data?.error || "Impossible d'initier la session de paiement auprès de Djomy." 
                };
            }

            return {
                success: true,
                transactionId: data.transactionId,
                redirectUrl: data.redirectUrl
            };

        } catch (error: any) {
            console.error('Error in WebPaymentService:', error);
            return {
                success: false,
                error: error.message || 'Une erreur inattendue est survenue.'
            };
        }
    }
}

// Instance unique du service de paiement web
// Sur mobile natif : toutes les méthodes retournent une erreur de redirection
export const paymentService: PaymentService = new WebPaymentService();
