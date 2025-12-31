'use client';

import { useState, useMemo } from 'react';
import { motion } from '@/components/motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api/client';
import { InlineInsights } from '@/components/ai-insights-card';
import type { Insight } from '@/lib/hooks/use-insights';

// Currency configuration for enterprise users
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
] as const;

type CurrencyCode = typeof CURRENCIES[number]['code'];

// SVG Icons to avoid Phosphor deprecation warnings
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/>
  </svg>
);

const CoinsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M184,89.57V84c0-25.08-37.83-44-88-44S8,58.92,8,84v40c0,20.89,26.25,37.49,64,42.46V172c0,25.08,37.83,44,88,44s88-18.92,88-44V132C248,111.3,222.58,94.68,184,89.57ZM232,132c0,13.22-30.79,28-72,28-3.73,0-7.43-.13-11.08-.37C170.49,151.77,184,139,184,124V105.74C213.87,110.19,232,122.27,232,132ZM72,150.25V126.46A183.74,183.74,0,0,0,96,128a183.74,183.74,0,0,0,24-1.54v23.79A163,163,0,0,1,96,152,163,163,0,0,1,72,150.25Zm96-40.32V124c0,8.39-12.41,17.4-32,22.87V123.5C148.91,120.37,159.84,115.71,168,109.93ZM96,56c41.21,0,72,14.78,72,28s-30.79,28-72,28S24,97.22,24,84,54.79,56,96,56ZM24,124V109.93c8.16,5.78,19.09,10.44,32,13.57v23.37C36.41,141.4,24,132.39,24,124Zm64,48v-4.17c2.63.1,5.29.17,8,.17,3.88,0,7.67-.13,11.39-.35A121.92,121.92,0,0,0,120,171.41v23.46C100.41,189.4,88,180.39,88,172Zm48,26.25V174.4a179.48,179.48,0,0,0,24,1.6,183.74,183.74,0,0,0,24-1.54v23.79a165.45,165.45,0,0,1-48,0Zm64-3.38V171.5c12.91-3.13,23.84-7.79,32-13.57V172C232,180.39,219.59,189.4,200,194.87Z"/>
  </svg>
);

const TrendUpIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M240,56v64a8,8,0,0,1-16,0V75.31l-82.34,82.35a8,8,0,0,1-11.32,0L96,123.31,29.66,189.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0L136,140.69,212.69,64H168a8,8,0,0,1,0-16h64A8,8,0,0,1,240,56Z"/>
  </svg>
);

const ChartLineUpIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h40a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31,40,179.31V200H224A8,8,0,0,1,232,208Z"/>
  </svg>
);

const CalculatorIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M80,120h96a8,8,0,0,0,8-8V64a8,8,0,0,0-8-8H80a8,8,0,0,0-8,8v48A8,8,0,0,0,80,120Zm8-48h80v32H88ZM200,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V40A16,16,0,0,0,200,24Zm0,192H56V40H200ZM100,148a12,12,0,1,1-12-12A12,12,0,0,1,100,148Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,140,148Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,180,148Zm-80,40a12,12,0,1,1-12-12A12,12,0,0,1,100,188Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,140,188Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,180,188Z"/>
  </svg>
);

interface CalculatorResult {
  value: number | string;
  label: string;
  description?: string;
  isHighlight?: boolean;
  isWarning?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

// Fetch AI insights from LLM
async function fetchInsights(
  toolName: string,
  data: Record<string, unknown>,
  setInsights: (insights: Insight[]) => void,
  setIsLoadingInsights: (loading: boolean) => void
): Promise<void> {
  setIsLoadingInsights(true);
  try {
    const response = await api.generateInsights(toolName, data);
    if (response.insights && response.insights.length > 0) {
      setInsights(response.insights.map(i => ({
        type: (i.type === 'tip' || i.type === 'warning' || i.type === 'action' || i.type === 'success' ? i.type : 'tip') as Insight['type'],
        message: i.message,
      })));
    } else {
      setInsights([]);
    }
  } catch (error) {
    console.error('Failed to fetch insights:', error);
    setInsights([]);
  } finally {
    setIsLoadingInsights(false);
  }
}

// Validation helpers
function validatePositiveNumber(value: string, fieldName: string): ValidationError | null {
  const num = parseFloat(value);
  if (value && (isNaN(num) || num < 0)) {
    return { field: fieldName, message: `${fieldName} must be a positive number` };
  }
  if (num > 1e15) {
    return { field: fieldName, message: `${fieldName} exceeds maximum allowed value` };
  }
  return null;
}

function validatePercentage(value: string, fieldName: string): ValidationError | null {
  const num = parseFloat(value);
  if (value && (isNaN(num) || num < 0 || num > 100)) {
    return { field: fieldName, message: `${fieldName} must be between 0 and 100` };
  }
  return null;
}

export default function CalculatorsPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  
  const currencySymbol = useMemo(() => {
    return CURRENCIES.find(c => c.code === currency)?.symbol ?? '$';
  }, [currency]);

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-lg sm:text-2xl md:text-3xl font-medium tracking-tight truncate">
              Financial Calculators
            </h1>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">
              Essential tools for startup financial planning
            </p>
          </div>
          <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
            <SelectTrigger className="w-[72px] sm:w-[130px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="sm:hidden">{c.symbol}</span>
                  <span className="hidden sm:inline">{c.symbol} {c.code}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <Tabs defaultValue="runway" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="runway">Runway</TabsTrigger>
          <TabsTrigger value="burnrate">Burn</TabsTrigger>
          <TabsTrigger value="valuation">Value</TabsTrigger>
          <TabsTrigger value="uniteconomics">Unit</TabsTrigger>
        </TabsList>

        <TabsContent value="runway">
          <RunwayCalculator currencySymbol={currencySymbol} />
        </TabsContent>
        <TabsContent value="burnrate">
          <BurnRateCalculator currencySymbol={currencySymbol} />
        </TabsContent>
        <TabsContent value="valuation">
          <ValuationCalculator currencySymbol={currencySymbol} />
        </TabsContent>
        <TabsContent value="uniteconomics">
          <UnitEconomicsCalculator currencySymbol={currencySymbol} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


function RunwayCalculator({ currencySymbol }: { currencySymbol: string }) {
  const [cashBalance, setCashBalance] = useState('');
  const [monthlyBurn, setMonthlyBurn] = useState('');
  const [monthlyRevenue, setMonthlyRevenue] = useState('');
  const [results, setResults] = useState<CalculatorResult[] | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validate = (): boolean => {
    const newErrors: ValidationError[] = [];
    
    const cashError = validatePositiveNumber(cashBalance, 'Cash Balance');
    if (cashError) newErrors.push(cashError);
    
    const burnError = validatePositiveNumber(monthlyBurn, 'Monthly Burn');
    if (burnError) newErrors.push(burnError);
    
    const revenueError = validatePositiveNumber(monthlyRevenue, 'Monthly Revenue');
    if (revenueError) newErrors.push(revenueError);
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const calculate = () => {
    if (!validate()) return;
    
    const cash = parseFloat(cashBalance) || 0;
    const burn = parseFloat(monthlyBurn) || 0;
    const revenue = parseFloat(monthlyRevenue) || 0;
    const netBurn = burn - revenue;

    if (netBurn <= 0) {
      setResults([
        { value: '∞', label: 'Runway', description: 'You are cash flow positive!', isHighlight: true },
        { value: formatCurrency(revenue - burn, currencySymbol), label: 'Monthly Profit' },
      ]);
      // Fetch LLM insights for profitable scenario
      void fetchInsights('Runway Calculator', {
        cashBalance: cash,
        monthlyBurn: burn,
        monthlyRevenue: revenue,
        netBurn: netBurn,
        isProfitable: true,
        monthlyProfit: revenue - burn,
      }, setInsights, setIsLoadingInsights);
      return;
    }

    const runwayMonths = cash / netBurn;
    const runwayDate = new Date();
    runwayDate.setMonth(runwayDate.getMonth() + Math.floor(runwayMonths));

    const isLowRunway = runwayMonths < 6;
    const isCriticalRunway = runwayMonths < 3;

    setResults([
      { 
        value: runwayMonths.toFixed(1), 
        label: 'Months of Runway', 
        isHighlight: true,
        isWarning: isCriticalRunway,
        description: isCriticalRunway ? 'Critical - start fundraising now' : isLowRunway ? 'Consider fundraising soon' : undefined,
      },
      { value: formatCurrency(netBurn, currencySymbol), label: 'Net Monthly Burn' },
      { value: runwayDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), label: 'Cash Out Date' },
      { value: formatCurrency(cash * 0.25 / netBurn, currencySymbol), label: 'Months to 25% Cash' },
    ]);
    
    // Fetch LLM insights
    void fetchInsights('Runway Calculator', {
      cashBalance: cash,
      monthlyBurn: burn,
      monthlyRevenue: revenue,
      netBurn: netBurn,
      runwayMonths: runwayMonths,
      cashOutDate: runwayDate.toISOString(),
      isCritical: isCriticalRunway,
      isLow: isLowRunway,
    }, setInsights, setIsLoadingInsights);
  };

  const getFieldError = (field: string) => errors.find(e => e.field === field)?.message;

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif">
          <CoinsIcon className="w-5 h-5" />
          Runway Calculator
        </CardTitle>
        <CardDescription>
          Calculate how long your cash will last based on current burn rate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Cash Balance ({currencySymbol})</Label>
            <Input
              type="number"
              placeholder="500000"
              value={cashBalance}
              onChange={(e) => setCashBalance(e.target.value)}
              className={getFieldError('Cash Balance') ? 'border-destructive' : ''}
            />
            {getFieldError('Cash Balance') && (
              <p className="text-xs text-destructive">{getFieldError('Cash Balance')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Monthly Burn ({currencySymbol})</Label>
            <Input
              type="number"
              placeholder="50000"
              value={monthlyBurn}
              onChange={(e) => setMonthlyBurn(e.target.value)}
              className={getFieldError('Monthly Burn') ? 'border-destructive' : ''}
            />
            {getFieldError('Monthly Burn') && (
              <p className="text-xs text-destructive">{getFieldError('Monthly Burn')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Monthly Revenue ({currencySymbol})</Label>
            <Input
              type="number"
              placeholder="10000"
              value={monthlyRevenue}
              onChange={(e) => setMonthlyRevenue(e.target.value)}
              className={getFieldError('Monthly Revenue') ? 'border-destructive' : ''}
            />
            {getFieldError('Monthly Revenue') && (
              <p className="text-xs text-destructive">{getFieldError('Monthly Revenue')}</p>
            )}
          </div>
        </div>
        <Button onClick={calculate} className="w-full sm:w-auto">Calculate Runway</Button>
        {results && <ResultsDisplay results={results} insights={insights} isLoadingInsights={isLoadingInsights} />}
      </CardContent>
    </Card>
  );
}

function BurnRateCalculator({ currencySymbol }: { currencySymbol: string }) {
  const [salaries, setSalaries] = useState('');
  const [rent, setRent] = useState('');
  const [software, setSoftware] = useState('');
  const [marketing, setMarketing] = useState('');
  const [other, setOther] = useState('');
  const [results, setResults] = useState<CalculatorResult[] | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validate = (): boolean => {
    const newErrors: ValidationError[] = [];
    const fields = [
      { value: salaries, name: 'Salaries' },
      { value: rent, name: 'Rent' },
      { value: software, name: 'Software' },
      { value: marketing, name: 'Marketing' },
      { value: other, name: 'Other' },
    ];
    
    for (const field of fields) {
      const error = validatePositiveNumber(field.value, field.name);
      if (error) newErrors.push(error);
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const calculate = () => {
    if (!validate()) return;
    
    const salaryVal = parseFloat(salaries) || 0;
    const rentVal = parseFloat(rent) || 0;
    const softwareVal = parseFloat(software) || 0;
    const marketingVal = parseFloat(marketing) || 0;
    const otherVal = parseFloat(other) || 0;
    const total = salaryVal + rentVal + softwareVal + marketingVal + otherVal;

    if (total === 0) {
      setResults([{ value: formatCurrency(0, currencySymbol), label: 'Monthly Burn Rate', description: 'Enter your expenses', isHighlight: true }]);
      setInsights([]);
      return;
    }

    const breakdown = [
      { name: 'Salaries', value: salaryVal },
      { name: 'Rent/Office', value: rentVal },
      { name: 'Software/Tools', value: softwareVal },
      { name: 'Marketing', value: marketingVal },
      { name: 'Other', value: otherVal },
    ].filter(i => i.value > 0);

    const largest = breakdown.sort((a, b) => b.value - a.value)[0];

    setResults([
      { value: formatCurrency(total, currencySymbol), label: 'Monthly Burn Rate', isHighlight: true },
      { value: formatCurrency(total * 12, currencySymbol), label: 'Annual Burn Rate' },
      { value: formatCurrency(total / 30, currencySymbol), label: 'Daily Burn Rate' },
      { value: largest ? `${largest.name} (${Math.round(largest.value / total * 100)}%)` : '-', label: 'Largest Expense' },
    ]);
    
    // Fetch LLM insights
    void fetchInsights('Burn Rate Calculator', {
      totalBurn: total,
      salaries: salaryVal,
      rent: rentVal,
      software: softwareVal,
      marketing: marketingVal,
      other: otherVal,
      salaryPercentage: total > 0 ? (salaryVal / total * 100).toFixed(1) : 0,
      breakdown: breakdown.map(b => ({ ...b, percentage: (b.value / total * 100).toFixed(1) })),
    }, setInsights, setIsLoadingInsights);
  };

  const getFieldError = (field: string) => errors.find(e => e.field === field)?.message;

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif">
          <TrendUpIcon className="w-5 h-5" />
          Burn Rate Calculator
        </CardTitle>
        <CardDescription>
          Break down your monthly expenses to understand your burn rate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Salaries & Benefits ({currencySymbol})</Label>
            <Input type="number" placeholder="30000" value={salaries} onChange={(e) => setSalaries(e.target.value)} className={getFieldError('Salaries') ? 'border-destructive' : ''} />
          </div>
          <div className="space-y-2">
            <Label>Rent & Office ({currencySymbol})</Label>
            <Input type="number" placeholder="5000" value={rent} onChange={(e) => setRent(e.target.value)} className={getFieldError('Rent') ? 'border-destructive' : ''} />
          </div>
          <div className="space-y-2">
            <Label>Software & Tools ({currencySymbol})</Label>
            <Input type="number" placeholder="2000" value={software} onChange={(e) => setSoftware(e.target.value)} className={getFieldError('Software') ? 'border-destructive' : ''} />
          </div>
          <div className="space-y-2">
            <Label>Marketing ({currencySymbol})</Label>
            <Input type="number" placeholder="5000" value={marketing} onChange={(e) => setMarketing(e.target.value)} className={getFieldError('Marketing') ? 'border-destructive' : ''} />
          </div>
          <div className="space-y-2">
            <Label>Other Expenses ({currencySymbol})</Label>
            <Input type="number" placeholder="3000" value={other} onChange={(e) => setOther(e.target.value)} className={getFieldError('Other') ? 'border-destructive' : ''} />
          </div>
        </div>
        {errors.length > 0 && (
          <p className="text-xs text-destructive">{errors[0].message}</p>
        )}
        <Button onClick={calculate} className="w-full sm:w-auto">Calculate Burn Rate</Button>
        {results && <ResultsDisplay results={results} insights={insights} isLoadingInsights={isLoadingInsights} />}
      </CardContent>
    </Card>
  );
}


function ValuationCalculator({ currencySymbol }: { currencySymbol: string }) {
  const [arr, setArr] = useState('');
  const [multiple, setMultiple] = useState('10');
  const [lastRoundVal, setLastRoundVal] = useState('');
  const [raised, setRaised] = useState('');
  const [results, setResults] = useState<CalculatorResult[] | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validate = (): boolean => {
    const newErrors: ValidationError[] = [];
    
    const arrError = validatePositiveNumber(arr, 'ARR');
    if (arrError) newErrors.push(arrError);
    
    const multipleNum = parseFloat(multiple);
    if (isNaN(multipleNum) || multipleNum < 0.1 || multipleNum > 100) {
      newErrors.push({ field: 'Multiple', message: 'Multiple must be between 0.1x and 100x' });
    }
    
    const lastValError = validatePositiveNumber(lastRoundVal, 'Last Round Valuation');
    if (lastValError) newErrors.push(lastValError);
    
    const raisedError = validatePositiveNumber(raised, 'Total Raised');
    if (raisedError) newErrors.push(raisedError);
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const calculate = () => {
    if (!validate()) return;
    
    const annualRevenue = parseFloat(arr) || 0;
    const revenueMultiple = parseFloat(multiple) || 10;
    const lastVal = parseFloat(lastRoundVal) || 0;
    const totalRaised = parseFloat(raised) || 0;

    if (annualRevenue === 0) {
      setResults([{ value: 'N/A', label: 'Enter ARR to calculate', isHighlight: true }]);
      setInsights([]);
      return;
    }

    const revenueBasedVal = annualRevenue * revenueMultiple;
    const impliedMultiple = lastVal > 0 && annualRevenue > 0 ? lastVal / annualRevenue : 0;

    setResults([
      { value: formatCurrency(revenueBasedVal, currencySymbol), label: `Valuation (${revenueMultiple}x ARR)`, isHighlight: true },
      { value: formatCurrency(revenueBasedVal * 0.8, currencySymbol), label: 'Conservative (0.8x)' },
      { value: formatCurrency(revenueBasedVal * 1.2, currencySymbol), label: 'Optimistic (1.2x)' },
      ...(impliedMultiple > 0 ? [{ value: `${impliedMultiple.toFixed(1)}x`, label: 'Last Round Multiple' }] : []),
      ...(totalRaised > 0 ? [{ value: formatCurrency(totalRaised, currencySymbol), label: 'Total Raised' }] : []),
    ]);
    
    // Fetch LLM insights
    void fetchInsights('Valuation Calculator', {
      arr: annualRevenue,
      multiple: revenueMultiple,
      estimatedValuation: revenueBasedVal,
      lastRoundValuation: lastVal,
      totalRaised: totalRaised,
      impliedMultiple: impliedMultiple,
      conservativeValuation: revenueBasedVal * 0.8,
      optimisticValuation: revenueBasedVal * 1.2,
    }, setInsights, setIsLoadingInsights);
  };

  const getFieldError = (field: string) => errors.find(e => e.field === field)?.message;

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif">
          <ChartLineUpIcon className="w-5 h-5" />
          Valuation Calculator
        </CardTitle>
        <CardDescription>
          Estimate your startup valuation based on revenue multiples
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Annual Recurring Revenue ({currencySymbol})</Label>
            <Input type="number" placeholder="1000000" value={arr} onChange={(e) => setArr(e.target.value)} className={getFieldError('ARR') ? 'border-destructive' : ''} />
          </div>
          <div className="space-y-2">
            <Label>Revenue Multiple (x)</Label>
            <Input type="number" placeholder="10" value={multiple} onChange={(e) => setMultiple(e.target.value)} className={getFieldError('Multiple') ? 'border-destructive' : ''} />
            <p className="text-xs text-muted-foreground">SaaS: 5-15x, Fintech: 8-20x</p>
          </div>
          <div className="space-y-2">
            <Label>Last Round Valuation ({currencySymbol})</Label>
            <Input type="number" placeholder="5000000" value={lastRoundVal} onChange={(e) => setLastRoundVal(e.target.value)} className={getFieldError('Last Round Valuation') ? 'border-destructive' : ''} />
          </div>
          <div className="space-y-2">
            <Label>Total Raised ({currencySymbol})</Label>
            <Input type="number" placeholder="1000000" value={raised} onChange={(e) => setRaised(e.target.value)} className={getFieldError('Total Raised') ? 'border-destructive' : ''} />
          </div>
        </div>
        {errors.length > 0 && (
          <p className="text-xs text-destructive">{errors[0].message}</p>
        )}
        <Button onClick={calculate} className="w-full sm:w-auto">Calculate Valuation</Button>
        {results && <ResultsDisplay results={results} insights={insights} isLoadingInsights={isLoadingInsights} />}
      </CardContent>
    </Card>
  );
}

function UnitEconomicsCalculator({ currencySymbol }: { currencySymbol: string }) {
  const [cac, setCac] = useState('');
  const [arpu, setArpu] = useState('');
  const [churnRate, setChurnRate] = useState('');
  const [grossMargin, setGrossMargin] = useState('70');
  const [results, setResults] = useState<CalculatorResult[] | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validate = (): boolean => {
    const newErrors: ValidationError[] = [];
    
    const cacError = validatePositiveNumber(cac, 'CAC');
    if (cacError) newErrors.push(cacError);
    
    const arpuError = validatePositiveNumber(arpu, 'ARPU');
    if (arpuError) newErrors.push(arpuError);
    
    const churnError = validatePercentage(churnRate, 'Churn Rate');
    if (churnError) newErrors.push(churnError);
    
    const marginError = validatePercentage(grossMargin, 'Gross Margin');
    if (marginError) newErrors.push(marginError);
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const calculate = () => {
    if (!validate()) return;
    
    const customerAcqCost = parseFloat(cac) || 0;
    const avgRevPerUser = parseFloat(arpu) || 0;
    const monthlyChurn = parseFloat(churnRate) || 0;
    const margin = parseFloat(grossMargin) || 70;
    
    if (monthlyChurn <= 0 || avgRevPerUser <= 0) {
      setResults([{ value: 'Invalid', label: 'Please enter valid ARPU and churn rate', isHighlight: true, isWarning: true }]);
      setInsights([]);
      return;
    }

    const avgLifetimeMonths = 1 / (monthlyChurn / 100);
    const ltv = avgRevPerUser * avgLifetimeMonths * (margin / 100);
    const ltvCacRatio = customerAcqCost > 0 ? ltv / customerAcqCost : 0;
    const paybackMonths = customerAcqCost > 0 ? customerAcqCost / (avgRevPerUser * (margin / 100)) : 0;

    const isHealthyRatio = ltvCacRatio >= 3;
    const isGoodPayback = paybackMonths <= 12;

    setResults([
      { value: formatCurrency(ltv, currencySymbol), label: 'Customer LTV', isHighlight: true },
      { 
        value: `${ltvCacRatio.toFixed(1)}x`, 
        label: 'LTV:CAC Ratio', 
        description: isHealthyRatio ? 'Healthy (≥3x)' : 'Needs improvement (<3x)',
        isWarning: !isHealthyRatio,
      },
      { 
        value: `${paybackMonths.toFixed(1)} mo`, 
        label: 'CAC Payback Period',
        description: isGoodPayback ? 'Good (<12 months)' : 'Consider optimizing',
        isWarning: !isGoodPayback,
      },
      { value: `${avgLifetimeMonths.toFixed(1)} mo`, label: 'Avg Customer Lifetime' },
    ]);
    
    // Fetch LLM insights
    void fetchInsights('Unit Economics Calculator', {
      cac: customerAcqCost,
      arpu: avgRevPerUser,
      monthlyChurn: monthlyChurn,
      grossMargin: margin,
      ltv: ltv,
      ltvCacRatio: ltvCacRatio,
      paybackMonths: paybackMonths,
      avgLifetimeMonths: avgLifetimeMonths,
      isHealthyRatio: isHealthyRatio,
      isGoodPayback: isGoodPayback,
    }, setInsights, setIsLoadingInsights);
  };

  const getFieldError = (field: string) => errors.find(e => e.field === field)?.message;

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif">
          <CalculatorIcon className="w-5 h-5" />
          Unit Economics Calculator
        </CardTitle>
        <CardDescription>
          Calculate LTV, CAC ratio, and payback period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Customer Acquisition Cost ({currencySymbol})</Label>
            <Input type="number" placeholder="500" value={cac} onChange={(e) => setCac(e.target.value)} className={getFieldError('CAC') ? 'border-destructive' : ''} />
          </div>
          <div className="space-y-2">
            <Label>Avg Revenue Per User/Month ({currencySymbol})</Label>
            <Input type="number" placeholder="100" value={arpu} onChange={(e) => setArpu(e.target.value)} className={getFieldError('ARPU') ? 'border-destructive' : ''} />
          </div>
          <div className="space-y-2">
            <Label>Monthly Churn Rate (%)</Label>
            <Input type="number" placeholder="5" value={churnRate} onChange={(e) => setChurnRate(e.target.value)} className={getFieldError('Churn Rate') ? 'border-destructive' : ''} />
          </div>
          <div className="space-y-2">
            <Label>Gross Margin (%)</Label>
            <Input type="number" placeholder="70" value={grossMargin} onChange={(e) => setGrossMargin(e.target.value)} className={getFieldError('Gross Margin') ? 'border-destructive' : ''} />
          </div>
        </div>
        {errors.length > 0 && (
          <p className="text-xs text-destructive">{errors[0].message}</p>
        )}
        <Button onClick={calculate} className="w-full sm:w-auto">Calculate Unit Economics</Button>
        {results && <ResultsDisplay results={results} insights={insights} isLoadingInsights={isLoadingInsights} />}
      </CardContent>
    </Card>
  );
}

function ResultsDisplay({ results, insights, isLoadingInsights }: { results: CalculatorResult[]; insights?: Insight[]; isLoadingInsights?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 pt-4 border-t border-border/40"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {results.map((result, i) => (
          <div
            key={i}
            className={cn(
              'p-3 sm:p-4 rounded-lg',
              result.isWarning ? 'bg-destructive/10 border border-destructive/20' :
              result.isHighlight ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'
            )}
          >
            <p className={cn(
              'text-lg sm:text-2xl font-semibold truncate', 
              result.isWarning ? 'text-destructive' : result.isHighlight && 'text-primary'
            )}>
              {result.value}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">{result.label}</p>
            {result.description && (
              <p className={cn(
                'text-[10px] sm:text-xs mt-1',
                result.isWarning ? 'text-destructive/70' : 'text-muted-foreground/70'
              )}>{result.description}</p>
            )}
          </div>
        ))}
      </div>
      
      {/* AI Insights Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-lg bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20"
      >
        <div className="flex items-center gap-2 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
            <path d="M208,144a15.78,15.78,0,0,1-10.42,14.94l-51.65,19-19,51.61a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88l51.65-19,19-51.61a15.92,15.92,0,0,1,29.88,0l19,51.65,51.61,19A15.78,15.78,0,0,1,208,144ZM152,48h16V64a8,8,0,0,0,16,0V48h16a8,8,0,0,0,0-16H184V16a8,8,0,0,0-16,0V32H152a8,8,0,0,0,0,16Zm88,32h-8V72a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0V96h8a8,8,0,0,0,0-16Z"/>
          </svg>
          <span className="text-sm font-medium text-primary">AI Insights</span>
        </div>
        <InlineInsights
          insights={insights || []}
          isLoading={isLoadingInsights}
          emptyText="No insights available"
        />
      </motion.div>
    </motion.div>
  );
}

function formatCurrency(value: number, symbol = '$'): string {
  if (value >= 1000000000) {
    return `${symbol}${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${symbol}${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${symbol}${(value / 1000).toFixed(0)}K`;
  }
  return `${symbol}${value.toFixed(0)}`;
}
