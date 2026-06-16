import { supabase } from './supabase';

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
        simulateSuccess: boolean
    ): Promise<{ success: boolean; transactionId?: string; error?: string }>;
}

class SimulatedPaymentService implements PaymentService {
    async createCheckoutSession(
        userId: string,
        method: PaymentMethod,
        options: PaymentSessionOptions,
        simulateSuccess: boolean
    ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
        try {
            // Simulate network latency (5 seconds for realistic feel)
            await new Promise(resolve => setTimeout(resolve, 5000));

            if (!simulateSuccess) {
                // Insert failed transaction in DB (graceful fallback)
                try {
                    await supabase.from('user_transactions').insert({
                        user_id: userId,
                        amount: options.amount,
                        currency: 'FG',
                        status: 'failed',
                        payment_method: method,
                        item_type: options.type,
                        item_quantity: options.quantity || 1,
                        plan_duration: options.duration
                    });
                } catch (err) {
                    console.warn("Could not insert failed transaction log in Supabase:", err);
                }

                return {
                    success: false,
                    error: 'La transaction a été refusée par votre opérateur mobile ou la banque.'
                };
            }

            const transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // Calculate expiration date in accelerated time for simulation testing
            let expirationDate: Date | null = null;
            if (options.type === 'premium') {
                expirationDate = new Date();
                if (options.duration === 'weekly') {
                    // Weekly = 30 minutes
                    expirationDate.setMinutes(expirationDate.getMinutes() + 30);
                } else if (options.duration === 'monthly') {
                    // Monthly = 60 minutes
                    expirationDate.setHours(expirationDate.getHours() + 1);
                } else if (options.duration === 'annual') {
                    // Annual = 90 minutes
                    expirationDate.setMinutes(expirationDate.getMinutes() + 90);
                }
            }

            // Write transaction record to DB (graceful fallback)
            try {
                const { error: txError } = await supabase.from('user_transactions').insert({
                    user_id: userId,
                    amount: options.amount,
                    currency: 'FG',
                    status: 'success',
                    payment_method: method,
                    item_type: options.type,
                    item_quantity: options.quantity || 1,
                    plan_duration: options.duration
                });
                if (txError) console.warn("Supabase tx logging returned an error (expected if migrations are not run):", txError);
            } catch (err) {
                console.warn("Could not write transaction log to Supabase:", err);
            }

            // Update user profile status (graceful fallback)
            if (options.type === 'premium') {
                try {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .update({
                            is_premium: true,
                            premium_until: expirationDate ? expirationDate.toISOString() : null
                        })
                        .eq('id', userId);

                    if (profileError) console.warn("Supabase profile update returned an error:", profileError);
                } catch (err) {
                    console.warn("Could not sync premium state to Supabase profile:", err);
                }
            } else if (options.type === 'coins') {
                try {
                    // Fetch current coins
                    const { data: profile, error: fetchError } = await supabase
                        .from('profiles')
                        .select('level_coins')
                        .eq('id', userId)
                        .single();

                    if (!fetchError && profile) {
                        const currentCoins = profile.level_coins || 0;
                        const addedCoins = options.quantity || 0;

                        const { error: profileError } = await supabase
                            .from('profiles')
                            .update({
                                level_coins: currentCoins + addedCoins
                            })
                            .eq('id', userId);

                        if (profileError) console.warn("Supabase profile coin update returned an error:", profileError);
                    }
                } catch (err) {
                    console.warn("Could not sync coins update to Supabase profile:", err);
                }
            }

            return {
                success: true,
                transactionId
            };
        } catch (error: any) {
            console.error('Error in SimulatedPaymentService:', error);
            return {
                success: false,
                error: error.message || 'Une erreur inattendue est survenue pendant la simulation.'
            };
        }
    }
}

class RealPaymentService implements PaymentService {
    async createCheckoutSession(
        userId: string,
        method: PaymentMethod,
        options: PaymentSessionOptions,
        simulateSuccess: boolean
    ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
        // Placeholders for future Flutterwave / Paystack API integration
        console.log('RealPaymentService.createCheckoutSession triggered for user:', userId);
        return {
            success: false,
            error: 'Le mode réel de paiement est en cours de déploiement. Utilisez le mode démo pour le moment.'
        };
    }
}

// Select active implementation based on environment variable
const mode = import.meta.env.VITE_PAYMENT_MODE || 'simulation';
export const paymentService: PaymentService = mode === 'production' 
    ? new RealPaymentService() 
    : new SimulatedPaymentService();
