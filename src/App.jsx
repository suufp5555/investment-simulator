import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { TrendingUp, Calendar, ArrowDownRight, ShieldAlert } from 'lucide-react';

// ChartJS setup
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

function App() {
  // Input states with default values
  const [initialPrincipal, setInitialPrincipal] = useState(100); // 万円
  const [monthlyContribution, setMonthlyContribution] = useState(3); // 万円
  const [yearlyContribution, setYearlyContribution] = useState(10); // 万円
  const [yieldRate, setYieldRate] = useState(5); // %
  const [currentAge, setCurrentAge] = useState(30); // 歳
  const [stopAge, setStopAge] = useState(60); // 歳
  const [withdrawalStartAge, setWithdrawalStartAge] = useState(65); // 歳
  
  // Pension and living expenses states (renamed livingExpense to retirementLivingExpense)
  const [pensionAmount, setPensionAmount] = useState(15); // 万円/月
  const [retirementLivingExpense, setRetirementLivingExpense] = useState(25); // 万円/月
  const [yearlyExtraExpense, setYearlyExtraExpense] = useState(50); // 万円/年 (老後追加費用)

  // Sync currentAge / stopAge / withdrawalStartAge
  const handleCurrentAgeChange = (val) => {
    const age = Math.min(Math.max(parseInt(val) || 0, 0), 99);
    setCurrentAge(age);
    if (age > stopAge) {
      setStopAge(age);
    }
    if (age > withdrawalStartAge) {
      setWithdrawalStartAge(age);
    }
  };

  const handleStopAgeChange = (val) => {
    const age = Math.min(Math.max(parseInt(val) || 0, currentAge), 100);
    setStopAge(age);
  };

  const handleWithdrawalStartAgeChange = (val) => {
    const age = Math.min(Math.max(parseInt(val) || 0, currentAge), 100);
    setWithdrawalStartAge(age);
  };

  // Simulation logic
  const simulationData = useMemo(() => {
    const data = [];
    const monthlyRate = yieldRate / 12 / 100;
    
    let totalPrincipal = initialPrincipal;
    let currentBalance = initialPrincipal;
    let accumulatedInterest = 0;

    // Push starting year data (age = currentAge)
    data.push({
      age: currentAge,
      total: Math.round(currentBalance * 100) / 100,
      withdrawal: 0,
      withdrawalRate: 0,
    });

    for (let age = currentAge + 1; age <= 100; age++) {
      const isWithdrawing = age >= withdrawalStartAge;
      // Stop accumulation starting at stopAge, and also stop completely once withdrawing
      const isAccumulating = (age - 1 < stopAge) && !isWithdrawing;

      const balanceAtStartOfYear = currentBalance;
      let yearlyWithdrawalTotal = 0;

      // 1. 年初一括取り崩し (老後追加費用)
      if (isWithdrawing && currentBalance > 0) {
        const actualExtra = Math.min(yearlyExtraExpense, currentBalance);
        currentBalance -= actualExtra;
        yearlyWithdrawalTotal += actualExtra;

        // Proportional reduction of principal (internally tracked)
        if (balanceAtStartOfYear > 0) {
          const ratio = totalPrincipal / balanceAtStartOfYear;
          totalPrincipal = Math.max(0, totalPrincipal - actualExtra * ratio);
        } else {
          totalPrincipal = 0;
        }
      }

      // 2. 年初一括投資 (追加投資額)
      if (isAccumulating) {
        totalPrincipal += yearlyContribution;
        currentBalance += yearlyContribution;
      }

      // Simulate 12 months for this year
      for (let month = 1; month <= 12; month++) {
        // Monthly shortfall withdrawal at start of month
        if (isWithdrawing && currentBalance > 0) {
          const monthlyShortfall = Math.max(0, retirementLivingExpense - pensionAmount);
          if (monthlyShortfall > 0) {
            const actualWithdrawal = Math.min(monthlyShortfall, currentBalance);
            
            const balanceBefore = currentBalance;
            currentBalance -= actualWithdrawal;
            yearlyWithdrawalTotal += actualWithdrawal;

            if (balanceBefore > 0) {
              const principalRatio = totalPrincipal / balanceBefore;
              const withdrawnPrincipal = actualWithdrawal * principalRatio;
              totalPrincipal = Math.max(0, totalPrincipal - withdrawnPrincipal);
            } else {
              totalPrincipal = 0;
            }
          }
        }

        // Monthly contribution at start of month
        if (isAccumulating) {
          totalPrincipal += monthlyContribution;
          currentBalance += monthlyContribution;
        }
        
        // Monthly compound interest at end of month
        const interestThisMonth = currentBalance * monthlyRate;
        currentBalance += interestThisMonth;
      }

      // Calculate withdrawal rate % based on starting balance of the year
      const ratePercent = balanceAtStartOfYear > 0 ? (yearlyWithdrawalTotal / balanceAtStartOfYear) * 100 : 0;

      data.push({
        age: age,
        total: Math.round(currentBalance * 100) / 100,
        withdrawal: Math.round(yearlyWithdrawalTotal * 100) / 100,
        withdrawalRate: Math.round(ratePercent * 100) / 100,
      });
    }

    return data;
  }, [initialPrincipal, monthlyContribution, yearlyContribution, yieldRate, currentAge, stopAge, withdrawalStartAge, pensionAmount, retirementLivingExpense, yearlyExtraExpense]);

  // Total withdrawal accumulator
  const totalWithdrawn = useMemo(() => {
    return simulationData.reduce((sum, d) => sum + d.withdrawal, 0);
  }, [simulationData]);

  // Chart configuration with 2 axes (y: Asset Total, y1: Withdrawal Rate %)
  const chartData = {
    labels: simulationData.map((d) => `${d.age}歳`),
    datasets: [
      {
        fill: true,
        label: '投資資産額合計',
        data: simulationData.map((d) => d.total),
        borderColor: '#4f46e5', // indigo-600
        backgroundColor: 'rgba(79, 70, 229, 0.15)',
        tension: 0.2,
        yAxisID: 'y',
      },
      {
        fill: false,
        label: '取り崩し率 (%)',
        data: simulationData.map((d) => d.withdrawalRate),
        borderColor: '#e11d48', // rose-600
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 1,
        tension: 0.2,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#334155', // slate-700
          font: {
            family: 'Inter',
            weight: 500,
          },
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        titleColor: '#0f172a',
        bodyColor: '#334155',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.datasetIndex === 0) {
                label += new Intl.NumberFormat('ja-JP', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(context.parsed.y) + ' 万円';
              } else {
                label += context.parsed.y.toFixed(2) + ' %';
              }
            }
            return label;
          },
          footer: function(tooltipItems) {
            const dataIndex = tooltipItems[0].dataIndex;
            const withdrawalVal = simulationData[dataIndex].withdrawal;
            if (withdrawalVal > 0) {
              return `年間取り崩し額: ${withdrawalVal.toLocaleString('ja-JP', { minimumFractionDigits: 2 })} 万円`;
            }
            return '';
          }
        },
        footerColor: '#e11d48', // rose-600
        footerFont: {
          weight: 'bold',
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.04)',
        },
        ticks: {
          color: '#64748b', // slate-500
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: {
          color: 'rgba(0, 0, 0, 0.04)',
        },
        ticks: {
          color: '#64748b',
          callback: function (value) {
            return value.toLocaleString() + ' 万';
          },
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 0,
        suggestedMax: 10,
        grid: {
          drawOnChartArea: false, // prevent grid overlapping
        },
        ticks: {
          color: '#e11d48',
          callback: function (value) {
            return value + '%';
          },
        },
      },
    },
  };

  const finalAsset = simulationData[simulationData.length - 1];
  const monthlyShortfall = Math.max(0, retirementLivingExpense - pensionAmount);

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>
          投資予測シミュレーター
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0, fontWeight: 500 }}>
          老後生活費と年金、追加費用から計算した取り崩し率を含む将来の資産推移を100歳までシミュレーションします
        </p>
      </header>

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(79, 70, 229, 0.08)', padding: '0.75rem', borderRadius: '12px' }}>
            <TrendingUp size={28} color="#4f46e5" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>100歳時点の投資資産額合計</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
              {finalAsset ? finalAsset.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748b' }}>万円</span>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(225, 29, 72, 0.08)', padding: '0.75rem', borderRadius: '12px' }}>
            <ArrowDownRight size={28} color="#e11d48" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>100歳までの累計取り崩し額</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#e11d48' }}>
              {totalWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748b' }}>万円</span>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.75rem', borderRadius: '12px' }}>
            <Calendar size={28} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>シミュレーション期間</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>
              {100 - currentAge} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748b' }}>年間</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Panel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', lgGridTemplateColumns: '430px 1fr', gap: '2rem', marginBottom: '2.5rem' }} className="main-grid-layout">
        
        {/* Left Side: Inputs */}
        <div className="glass-card animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.4rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0', borderBottom: '1px solid rgba(0, 0, 0, 0.06)', paddingBottom: '0.75rem', color: '#0f172a' }}>
            シミュレーション設定
          </h2>

          {/* 元本 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>元本 (初期投資額)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  type="number"
                  value={initialPrincipal}
                  onChange={(e) => setInitialPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ width: '90px', textAlign: 'right' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>万円</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="5000"
              step="10"
              value={initialPrincipal}
              onChange={(e) => setInitialPrincipal(parseFloat(e.target.value))}
            />
          </div>

          {/* 毎月積立額 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>毎月積立額</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ width: '90px', textAlign: 'right' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>万円</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(parseFloat(e.target.value))}
            />
          </div>

          {/* 年追加投資額 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>年追加投資額</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  type="number"
                  value={yearlyContribution}
                  onChange={(e) => setYearlyContribution(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ width: '90px', textAlign: 'right' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>万円</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              step="5"
              value={yearlyContribution}
              onChange={(e) => setYearlyContribution(parseFloat(e.target.value))}
            />
          </div>

          {/* 平均利回り */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>平均利回り</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  type="number"
                  value={yieldRate}
                  onChange={(e) => setYieldRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ width: '90px', textAlign: 'right' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.1"
              value={yieldRate}
              onChange={(e) => setYieldRate(parseFloat(e.target.value))}
            />
          </div>

          {/* 老後生活費/月 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>老後生活費/月</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  type="number"
                  value={retirementLivingExpense}
                  onChange={(e) => setRetirementLivingExpense(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ width: '90px', textAlign: 'right' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>万円</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={retirementLivingExpense}
              onChange={(e) => setRetirementLivingExpense(parseFloat(e.target.value))}
            />
          </div>

          {/* 年金/月 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>年金額/月</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  type="number"
                  value={pensionAmount}
                  onChange={(e) => setPensionAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ width: '90px', textAlign: 'right' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>万円</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={pensionAmount}
              onChange={(e) => setPensionAmount(parseFloat(e.target.value))}
            />
          </div>

          {/* 老後追加費用/年 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>老後追加費用/年</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  type="number"
                  value={yearlyExtraExpense}
                  onChange={(e) => setYearlyExtraExpense(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ width: '90px', textAlign: 'right' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>万円</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="5"
              value={yearlyExtraExpense}
              onChange={(e) => setYearlyExtraExpense(parseFloat(e.target.value))}
            />
          </div>

          {/* 取り崩し情報 */}
          <div style={{ background: 'rgba(79, 70, 229, 0.04)', border: '1px solid rgba(79, 70, 229, 0.1)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.85rem', color: '#4f46e5' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem', fontWeight: 600 }}>
              <ShieldAlert size={16} />
              <span>取り崩し期（老後）の年間支出予定</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#334155', lineHeight: '1.4' }}>
              <li>生活費不足額: {monthlyShortfall > 0 ? `${monthlyShortfall} 万円/月 (年間 ${monthlyShortfall * 12} 万円)` : 'なし (年金でカバー)'}</li>
              <li>老後追加費用: {yearlyExtraExpense} 万円/年 (年初に一括)</li>
              <li style={{ fontWeight: 600, color: '#e11d48', marginTop: '0.25rem' }}>
                年間総取り崩し額: {((monthlyShortfall * 12) + yearlyExtraExpense).toLocaleString('ja-JP', { minimumFractionDigits: 2 })} 万円/年
              </li>
            </ul>
          </div>

          {/* 年齢設定グリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', borderTop: '1px solid rgba(0, 0, 0, 0.06)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>現在の年齢</label>
              <input
                type="number"
                min="0"
                max="99"
                value={currentAge}
                onChange={(e) => handleCurrentAgeChange(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.9rem', padding: '6px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>積立停止年齢</label>
              <input
                type="number"
                min={currentAge}
                max="100"
                value={stopAge}
                onChange={(e) => handleStopAgeChange(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.9rem', padding: '6px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>取り崩し開始</label>
              <input
                type="number"
                min={currentAge}
                max="100"
                value={withdrawalStartAge}
                onChange={(e) => handleWithdrawalStartAgeChange(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.9rem', padding: '6px' }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Chart */}
        <div className="glass-card animate-fade-in" style={{ padding: '2rem', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1.5rem 0', color: '#0f172a' }}>資産推移・取り崩し率グラフ (100歳まで)</h2>
          <div style={{ flexGrow: 1, position: 'relative', height: '100%', minHeight: '350px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

      </div>

      {/* Table: Simulation breakdown */}
      <div className="glass-card animate-fade-in" style={{ padding: '2rem', overflowX: 'auto' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1.5rem 0', color: '#0f172a' }}>シミュレーション詳細データ (年毎)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)', color: '#64748b' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>年齢</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>投資資産額合計 (万円)</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>年毎の取り崩し額 (万円)</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>年毎の取り崩し率 (%)</th>
            </tr>
          </thead>
          <tbody>
            {simulationData.map((row, index) => (
              <tr key={index} style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.04)' }} className="table-row">
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1e293b' }}>
                  {row.age} 歳 
                  {row.age === currentAge && <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(79, 70, 229, 0.08)', color: '#4f46e5', marginLeft: '6px', fontWeight: 600 }}>開始</span>} 
                  {row.age === stopAge && row.age < withdrawalStartAge && <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', marginLeft: '6px', fontWeight: 600 }}>積立停止</span>} 
                  {row.age === withdrawalStartAge && <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(225, 29, 72, 0.08)', color: '#e11d48', marginLeft: '6px', fontWeight: 600 }}>取り崩し開始</span>}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#0284c7', fontWeight: 600 }}>{row.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#e11d48', fontWeight: 500 }}>
                  {row.withdrawal > 0 ? row.withdrawal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#e11d48', fontWeight: 600 }}>
                  {row.withdrawalRate > 0 ? `${row.withdrawalRate.toFixed(2)} %` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Extra layout style */}
      <style>{`
        @media (min-width: 1024px) {
          .main-grid-layout {
            grid-template-columns: 430px 1fr !important;
          }
        }
        .table-row:hover {
          background: rgba(0, 0, 0, 0.015);
        }
      `}</style>
    </div>
  );
}

export default App;
