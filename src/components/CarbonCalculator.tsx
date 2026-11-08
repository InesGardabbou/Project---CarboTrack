import { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CarbonImpactCalculatorProps {
    realTimeMachineEmissions: number; // in kg/h or similar unit, we'll assume kg for the total calculation context
}

export function CarbonImpactCalculator({ realTimeMachineEmissions }: CarbonImpactCalculatorProps) {
    const [materialImpact, setMaterialImpact] = useState<string>('');
    const [productCount, setProductCount] = useState<string>('');
    const [totalImpact, setTotalImpact] = useState<number | null>(null);

    const handleCalculate = () => {
        const material = parseFloat(materialImpact) || 0;
        const count = parseFloat(productCount) || 0;

        // Calculation: (Material Impact * Count) + Real-time Machine Emissions (assuming rate is hourly, maybe we treat it as "current impact state")
        // The prompt implies syncing with real-time data.
        // Let's assume the user wants to see: Product Impact + Machine Impact.
        const productTotal = material * count;
        const total = productTotal + realTimeMachineEmissions;

        setTotalImpact(total);
    };

    // Auto-recalculate if real-time emissions change and we have a calculated value
    useEffect(() => {
        if (totalImpact !== null) {
            handleCalculate();
        }
    }, [realTimeMachineEmissions]);

    return (
        <div className="glass-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Calculateur d'Impact Carbone par Produit</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
                Calculez l'impact carbone par produit en fonction des matières premières et de la production
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                    <Label htmlFor="material-impact">Impact Carbone Matière Première (kg CO₂)</Label>
                    <Input
                        id="material-impact"
                        placeholder="Ex: 5.2"
                        value={materialImpact}
                        onChange={(e) => setMaterialImpact(e.target.value)}
                        className="bg-background/50"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="product-count">Nombre de Produits par Jour</Label>
                    <Input
                        id="product-count"
                        placeholder="Ex: 100"
                        value={productCount}
                        onChange={(e) => setProductCount(e.target.value)}
                        className="bg-background/50"
                    />
                </div>
            </div>

            <div className="mb-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                    Impact Carbone Total de l'Entreprise:
                </p>
                <span className="text-2xl font-bold text-foreground">
                    {totalImpact !== null ? totalImpact.toFixed(2) : '0.0'} kg CO₂
                </span>
                {totalImpact !== null && (
                    <span className="text-xs text-muted-foreground ml-2">
                        (Incl. {realTimeMachineEmissions.toFixed(2)} kg des machines en temps réel)
                    </span>
                )}
            </div>

            <Button
                onClick={handleCalculate}
                className="w-full bg-[#10b981] hover:bg-[#059669] text-white"
            >
                Calculer l'Impact
            </Button>
        </div>
    );
}
