'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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
}

export default function CalculatorsPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeftIcon />
        </Button>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight">
            Financial Calculators
          </h1>
          <p className="text-sm text-muted-foreground">
            Essential tools for startup financial planning
          </p>
        </div>
      </motion.div>

      <Tabs defaultValue="runway" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="runway" className="text-xs sm:text-sm">
            <CoinsIcon className="w-4 h-4 mr-1.5 hidden sm:inline" />
            Runway
          </TabsTrigger>
          <TabsTrigger value="burnrate" className="text-xs sm:text-sm">
            <TrendUpIcon className="w-4 h-4 mr-1.5 hidden sm:inline" />
            Burn Rate
          </TabsTrigger>
          <TabsTrigger value="valuation" className="text-xs sm:text-sm">
            <ChartLineUpIcon className="w-4 h-4 mr-1.5 hidden sm:inline" />
            Valuation
          </TabsTrigger>
          <TabsTrigger value="uniteconomics" className="text-xs sm:text-sm">
            <CalculatorIcon className="w-4 h-4 mr-1.5 hidden sm:inline" />
            Unit Econ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="runway">
          <RunwayCalculator />
        </TabsContent>
        <TabsContent value="burnrate">
          <BurnRateCalculator />
        </TabsContent>
        <TabsContent value="valuation">
          <ValuationCalculator />
        </TabsContent>
        <TabsContent value="uniteconomics">
          <UnitEconomicsCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}


function RunwayCalculator() {
  const [cashBalance, setCashBalance] = useState('');
  const [monthlyBurn, setMonthlyBurn] = useState('');
  const [monthlyRevenue, setMonthlyRevenue] = useState('');
  const [results, setResults] = useState<CalculatorResult[] | null>(null);

  const calculate = () => {
    const cash = parseFloat(cashBalance) || 0;
    const burn = parseFloat(monthlyBurn) || 0;
    const revenue = parseFloat(monthlyRevenue) || 0;
    const netBurn = burn - revenue;

    if (netBurn <= 0) {
      setResults([
        { value: '∞', label: 'Runway', description: 'You are cash flow positive!', isHighlight: true },
        { value: formatCurrency(revenue - burn), label: 'Monthly Profit' },
      ]);
      return;
    }

    const runwayMonths = cash / netBurn;
    const runwayDate = new Date();
    runwayDate.setMonth(runwayDate.getMonth() + Math.floor(runwayMonths));

    setResults([
      { value: runwayMonths.toFixed(1), label: 'Months of Runway', isHighlight: true },
      { value: formatCurrency(netBurn), label: 'Net Monthly Burn' },
      { value: runwayDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), label: 'Cash Out Date' },
      { value: formatCurrency(cash * 0.25 / netBurn), label: 'Months to 25% Cash' },
    ]);
  };

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
            <Label>Cash Balance ($)</Label>
            <Input
              type="number"
              placeholder="500000"
              value={cashBalance}
              onChange={(e) => setCashBalance(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Monthly Burn ($)</Label>
            <Input
              type="number"
              placeholder="50000"
              value={monthlyBurn}
              onChange={(e) => setMonthlyBurn(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Monthly Revenue ($)</Label>
            <Input
              type="number"
              placeholder="10000"
              value={monthlyRevenue}
              onChange={(e) => setMonthlyRevenue(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={calculate} className="w-full sm:w-auto">Calculate Runway</Button>
        {results && <ResultsDisplay results={results} />}
      </CardContent>
    </Card>
  );
}

function BurnRateCalculator() {
  const [salaries, setSalaries] = useState('');
  const [rent, setRent] = useState('');
  const [software, setSoftware] = useState('');
  const [marketing, setMarketing] = useState('');
  const [other, setOther] = useState('');
  const [results, setResults] = useState<CalculatorResult[] | null>(null);

  const calculate = () => {
    const total = [salaries, rent, software, marketing, other]
      .map(v => parseFloat(v) || 0)
      .reduce((a, b) => a + b, 0);

    const breakdown = [
      { name: 'Salaries', value: parseFloat(salaries) || 0 },
      { name: 'Rent/Office', value: parseFloat(rent) || 0 },
      { name: 'Software/Tools', value: parseFloat(software) || 0 },
      { name: 'Marketing', value: parseFloat(marketing) || 0 },
      { name: 'Other', value: parseFloat(other) || 0 },
    ].filter(i => i.value > 0);

    const largest = breakdown.sort((a, b) => b.value - a.value)[0];

    setResults([
      { value: formatCurrency(total), label: 'Monthly Burn Rate', isHighlight: true },
      { value: formatCurrency(total * 12), label: 'Annual Burn Rate' },
      { value: formatCurrency(total / 30), label: 'Daily Burn Rate' },
      { value: largest ? `${largest.name} (${Math.round(largest.value / total * 100)}%)` : '-', label: 'Largest Expense' },
    ]);
  };

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
            <Label>Salaries & Benefits ($)</Label>
            <Input type="number" placeholder="30000" value={salaries} onChange={(e) => setSalaries(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Rent & Office ($)</Label>
            <Input type="number" placeholder="5000" value={rent} onChange={(e) => setRent(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Software & Tools ($)</Label>
            <Input type="number" placeholder="2000" value={software} onChange={(e) => setSoftware(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Marketing ($)</Label>
            <Input type="number" placeholder="5000" value={marketing} onChange={(e) => setMarketing(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Other Expenses ($)</Label>
            <Input type="number" placeholder="3000" value={other} onChange={(e) => setOther(e.target.value)} />
          </div>
        </div>
        <Button onClick={calculate} className="w-full sm:w-auto">Calculate Burn Rate</Button>
        {results && <ResultsDisplay results={results} />}
      </CardContent>
    </Card>
  );
}


function ValuationCalculator() {
  const [arr, setArr] = useState('');
  const [multiple, setMultiple] = useState('10');
  const [lastRoundVal, setLastRoundVal] = useState('');
  const [raised, setRaised] = useState('');
  const [results, setResults] = useState<CalculatorResult[] | null>(null);

  const calculate = () => {
    const annualRevenue = parseFloat(arr) || 0;
    const revenueMultiple = parseFloat(multiple) || 10;
    const lastVal = parseFloat(lastRoundVal) || 0;
    const totalRaised = parseFloat(raised) || 0;

    const revenueBasedVal = annualRevenue * revenueMultiple;
    const impliedMultiple = lastVal > 0 && annualRevenue > 0 ? lastVal / annualRevenue : 0;

    setResults([
      { value: formatCurrency(revenueBasedVal), label: `Valuation (${revenueMultiple}x ARR)`, isHighlight: true },
      { value: formatCurrency(revenueBasedVal * 0.8), label: 'Conservative (0.8x)' },
      { value: formatCurrency(revenueBasedVal * 1.2), label: 'Optimistic (1.2x)' },
      ...(impliedMultiple > 0 ? [{ value: `${impliedMultiple.toFixed(1)}x`, label: 'Last Round Multiple' }] : []),
      ...(totalRaised > 0 ? [{ value: formatCurrency(totalRaised), label: 'Total Raised' }] : []),
    ]);
  };

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
            <Label>Annual Recurring Revenue ($)</Label>
            <Input type="number" placeholder="1000000" value={arr} onChange={(e) => setArr(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Revenue Multiple (x)</Label>
            <Input type="number" placeholder="10" value={multiple} onChange={(e) => setMultiple(e.target.value)} />
            <p className="text-xs text-muted-foreground">SaaS: 5-15x, Fintech: 8-20x</p>
          </div>
          <div className="space-y-2">
            <Label>Last Round Valuation ($)</Label>
            <Input type="number" placeholder="5000000" value={lastRoundVal} onChange={(e) => setLastRoundVal(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Total Raised ($)</Label>
            <Input type="number" placeholder="1000000" value={raised} onChange={(e) => setRaised(e.target.value)} />
          </div>
        </div>
        <Button onClick={calculate} className="w-full sm:w-auto">Calculate Valuation</Button>
        {results && <ResultsDisplay results={results} />}
      </CardContent>
    </Card>
  );
}

function UnitEconomicsCalculator() {
  const [cac, setCac] = useState('');
  const [arpu, setArpu] = useState('');
  const [churnRate, setChurnRate] = useState('');
  const [grossMargin, setGrossMargin] = useState('70');
  const [results, setResults] = useState<CalculatorResult[] | null>(null);

  const calculate = () => {
    const customerAcqCost = parseFloat(cac) || 0;
    const avgRevPerUser = parseFloat(arpu) || 0;
    const monthlyChurn = parseFloat(churnRate) || 0;
    const margin = parseFloat(grossMargin) || 70;

    if (monthlyChurn <= 0 || avgRevPerUser <= 0) {
      setResults([{ value: 'Invalid', label: 'Please enter valid values', isHighlight: true }]);
      return;
    }

    const avgLifetimeMonths = 1 / (monthlyChurn / 100);
    const ltv = avgRevPerUser * avgLifetimeMonths * (margin / 100);
    const ltvCacRatio = customerAcqCost > 0 ? ltv / customerAcqCost : 0;
    const paybackMonths = customerAcqCost > 0 ? customerAcqCost / (avgRevPerUser * (margin / 100)) : 0;

    setResults([
      { value: formatCurrency(ltv), label: 'Customer LTV', isHighlight: true },
      { value: `${ltvCacRatio.toFixed(1)}x`, label: 'LTV:CAC Ratio', description: ltvCacRatio >= 3 ? 'Healthy (≥3x)' : 'Needs improvement (<3x)' },
      { value: `${paybackMonths.toFixed(1)} mo`, label: 'CAC Payback Period' },
      { value: `${avgLifetimeMonths.toFixed(1)} mo`, label: 'Avg Customer Lifetime' },
    ]);
  };

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
            <Label>Customer Acquisition Cost ($)</Label>
            <Input type="number" placeholder="500" value={cac} onChange={(e) => setCac(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Avg Revenue Per User/Month ($)</Label>
            <Input type="number" placeholder="100" value={arpu} onChange={(e) => setArpu(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Monthly Churn Rate (%)</Label>
            <Input type="number" placeholder="5" value={churnRate} onChange={(e) => setChurnRate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Gross Margin (%)</Label>
            <Input type="number" placeholder="70" value={grossMargin} onChange={(e) => setGrossMargin(e.target.value)} />
          </div>
        </div>
        <Button onClick={calculate} className="w-full sm:w-auto">Calculate Unit Economics</Button>
        {results && <ResultsDisplay results={results} />}
      </CardContent>
    </Card>
  );
}

function ResultsDisplay({ results }: { results: CalculatorResult[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border/40"
    >
      {results.map((result, i) => (
        <div
          key={i}
          className={cn(
            'p-4 rounded-lg',
            result.isHighlight ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'
          )}
        >
          <p className={cn('text-2xl font-semibold', result.isHighlight && 'text-primary')}>
            {result.value}
          </p>
          <p className="text-sm text-muted-foreground">{result.label}</p>
          {result.description && (
            <p className="text-xs text-muted-foreground/70 mt-1">{result.description}</p>
          )}
        </div>
      ))}
    </motion.div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}
