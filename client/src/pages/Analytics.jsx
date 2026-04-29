import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Shield, Users, Calendar, Clock, Camera, Activity, UserX, Award, Target } from 'lucide-react';
import Navbar from '../components/Navbar';
import { getViolationAnalytics } from '../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

// Mock worker-specific data (can be replaced with real API data later)
const generateMockWorkerData = (topViolators) => {
  // If we have real data, enhance it with mock PPE/Zone breakdown
  if (topViolators && topViolators.length > 0) {
    return topViolators.slice(0, 10).map((violator, index) => {
      const totalViolations = violator.count;
      // Randomly split between PPE and Zone violations (realistic distribution)
      const zoneViolations = Math.floor(totalViolations * (0.2 + Math.random() * 0.3));
      const ppeViolations = totalViolations - zoneViolations;
      
      return {
        workerId: violator.workerId,
        name: violator.name,
        role: violator.role,
        totalViolations,
        ppeViolations,
        zoneViolations,
        lastViolation: violator.lastViolation,
        complianceScore: Math.max(0, 100 - (totalViolations * 5)),
        repeatOffender: totalViolations >= 8
      };
    });
  }
  
  // Fallback mock data if no real data available
  return [
    { workerId: "WRK-788442", name: "Archit Chitte", role: "Technician", totalViolations: 15, ppeViolations: 10, zoneViolations: 5, lastViolation: new Date('2026-03-12'), complianceScore: 25, repeatOffender: true },
    { workerId: "WRK-332026", name: "Atharva Pingale", role: "Operator", totalViolations: 12, ppeViolations: 9, zoneViolations: 3, lastViolation: new Date('2026-03-13'), complianceScore: 40, repeatOffender: true },
    { workerId: "WRK-446069", name: "Varun Rahatgaonkar", role: "Welder", totalViolations: 10, ppeViolations: 7, zoneViolations: 3, lastViolation: new Date('2026-03-11'), complianceScore: 50, repeatOffender: true },
    { workerId: "WRK-268133", name: "Tanaya Jain", role: "Supervisor", totalViolations: 8, ppeViolations: 6, zoneViolations: 2, lastViolation: new Date('2026-03-10'), complianceScore: 60, repeatOffender: true },
    { workerId: "WRK-102345", name: "Akhil Sharma", role: "Electrician", totalViolations: 7, ppeViolations: 5, zoneViolations: 2, lastViolation: new Date('2026-03-09'), complianceScore: 65, repeatOffender: false },
    { workerId: "WRK-214567", name: "Rahul Verma", role: "Technician", totalViolations: 6, ppeViolations: 4, zoneViolations: 2, lastViolation: new Date('2026-03-08'), complianceScore: 70, repeatOffender: false },
    { workerId: "WRK-312876", name: "Priya Nair", role: "Operator", totalViolations: 5, ppeViolations: 4, zoneViolations: 1, lastViolation: new Date('2026-03-07'), complianceScore: 75, repeatOffender: false },
    { workerId: "WRK-425789", name: "Amit Patel", role: "Welder", totalViolations: 4, ppeViolations: 3, zoneViolations: 1, lastViolation: new Date('2026-03-06'), complianceScore: 80, repeatOffender: false },
    { workerId: "WRK-536891", name: "Sneha Desai", role: "General", totalViolations: 3, ppeViolations: 2, zoneViolations: 1, lastViolation: new Date('2026-03-05'), complianceScore: 85, repeatOffender: false },
    { workerId: "WRK-647902", name: "Rohan Singh", role: "Technician", totalViolations: 2, ppeViolations: 2, zoneViolations: 0, lastViolation: new Date('2026-03-04'), complianceScore: 90, repeatOffender: false }
  ];
};

const StatCard = ({ icon: Icon, label, value, color, subtitle, trend }) => (
  <div className="card p-5 flex items-start gap-4 animate-fade-in hover:shadow-lg transition-shadow">
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color} flex-shrink-0`}>
      <Icon className="w-7 h-7" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
      {subtitle && (
        <div className="flex items-center gap-1 mt-1">
          {trend !== undefined && (
            trend >= 0 ? (
              <TrendingUp className="w-3 h-3 text-red-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-green-500" />
            )
          )}
          <p className={`text-xs ${trend !== undefined ? (trend >= 0 ? 'text-red-400' : 'text-green-400') : 'text-slate-500'}`}>
            {subtitle}
          </p>
        </div>
      )}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-slate-300 text-sm font-medium mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-white text-sm">
            <span className="font-semibold">{entry.name}:</span> {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workerData, setWorkerData] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await getViolationAnalytics();
      const data = response.data.data;
      setAnalyticsData(data);
      
      // Generate worker-specific data
      const workers = generateMockWorkerData(data.topViolators);
      setWorkerData(workers);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
      // Use fallback mock data
      setWorkerData(generateMockWorkerData([]));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
              <p className="text-slate-400 mt-4">Loading analytics...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No analytics data available</p>
          </div>
        </main>
      </div>
    );
  }

  const { summary, violationsByType, topViolators, violationsOverTime, violationsByCamera, violationsByTimeOfDay } = analyticsData;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Page Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-white mb-2">
            Safety <span className="text-gradient">Analytics</span>
          </h1>
          <p className="text-slate-400">Comprehensive safety metrics and violation trends over the last 30 days</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={AlertTriangle}
            label="Total Violations"
            value={summary.totalViolations}
            color="bg-red-500/10 text-red-500"
            subtitle="Last 30 days"
          />
          <StatCard
            icon={TrendingUp}
            label="This Week"
            value={summary.thisWeek}
            color="bg-orange-500/10 text-orange-500"
            subtitle={`${summary.weekChange >= 0 ? '+' : ''}${summary.weekChange}% from last week`}
            trend={summary.weekChange}
          />
          <StatCard
            icon={Shield}
            label="PPE Violations"
            value={summary.ppeViolations}
            color="bg-yellow-500/10 text-yellow-500"
            subtitle="Equipment related"
          />
          <StatCard
            icon={Users}
            label="Unique Violators"
            value={summary.uniqueViolators}
            color="bg-blue-500/10 text-blue-500"
            subtitle="Workers involved"
          />
        </div>

        {/* Worker-Specific Analytics Section */}
        <div className="card p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-primary-500/20">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-6 h-6 text-primary-500" />
            <h2 className="text-2xl font-bold text-white">Worker Safety Analytics</h2>
          </div>
          
          {/* Worker Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={UserX}
              label="Worker with Most Violations"
              value={workerData.length > 0 ? workerData[0].name.split(' ')[0] : 'N/A'}
              color="bg-red-500/10 text-red-500"
              subtitle={workerData.length > 0 ? `${workerData[0].totalViolations} violations` : ''}
            />
            <StatCard
              icon={Users}
              label="Total Workers with Violations"
              value={workerData.length}
              color="bg-orange-500/10 text-orange-500"
              subtitle="In last 30 days"
            />
            <StatCard
              icon={Target}
              label="Average Violations per Worker"
              value={workerData.length > 0 ? (workerData.reduce((sum, w) => sum + w.totalViolations, 0) / workerData.length).toFixed(1) : '0'}
              color="bg-yellow-500/10 text-yellow-500"
              subtitle="Per worker metric"
            />
            <StatCard
              icon={Award}
              label="Repeat Offenders"
              value={workerData.filter(w => w.repeatOffender).length}
              color="bg-purple-500/10 text-purple-500"
              subtitle="8+ violations"
            />
          </div>
        </div>

        {/* Worker-Specific Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Violating Workers Bar Chart */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-white">Top Violating Workers</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workerData.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalViolations" fill="#ef4444" name="Total Violations" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Worker Violation Distribution Pie Chart */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-white">Worker Violation Distribution</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={workerData.slice(0, 8).map(w => ({ name: w.name.split(' ')[0], value: w.totalViolations }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {workerData.slice(0, 8).map((entry, index) => (
                    <path key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* PPE vs Zone Violations by Worker */}
          <div className="card p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-white">PPE vs Zone Violations by Worker</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={workerData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 10 }}
                  angle={-15}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="ppeViolations" stackId="a" fill="#f59e0b" name="PPE Violations" radius={[0, 0, 0, 0]} />
                <Bar dataKey="zoneViolations" stackId="a" fill="#ef4444" name="Zone Violations" radius={[8, 8, 0, 0]} />
                <Line type="monotone" dataKey="totalViolations" stroke="#3b82f6" strokeWidth={2} name="Total" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Worker Compliance Score */}
          <div className="card p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Award className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-white">Worker Safety Compliance Score</h2>
              <span className="text-xs text-slate-400 ml-auto">Higher is better</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workerData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 10 }}
                  angle={-15}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="complianceScore" 
                  fill="#22c55e" 
                  name="Compliance Score (%)" 
                  radius={[8, 8, 0, 0]}
                >
                  {workerData.slice(0, 10).map((entry, index) => (
                    <path 
                      key={`bar-${index}`} 
                      fill={entry.complianceScore >= 70 ? '#22c55e' : entry.complianceScore >= 50 ? '#f59e0b' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Violations Over Time */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-white">Violations Trend (30 Days)</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={violationsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  name="Violations"
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Violations by Type */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-white">Violations by Type</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={violationsByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="type" 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3b82f6" name="Count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Violations by Camera */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Camera className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-white">Violations by Camera</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={violationsByCamera}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {violationsByCamera.map((entry, index) => (
                    <path key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Violations by Time of Day */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-white">Violations by Hour</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={violationsByTimeOfDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 11 }}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#8b5cf6" name="Violations" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Enhanced Top Violators Table with PPE/Zone Breakdown */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-white">Detailed Worker Violation Report</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>High Risk (10+)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>Medium (5-9)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Low (1-4)</span>
              </div>
            </div>
          </div>
          
          {workerData.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No violation data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Rank</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Worker ID</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Name</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Role</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Total</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">PPE</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Zone</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Compliance</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Last Violation</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workerData.map((worker, index) => (
                    <tr key={worker.workerId} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                          index === 1 ? 'bg-slate-400/20 text-slate-400' :
                          index === 2 ? 'bg-orange-500/20 text-orange-500' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white font-mono text-sm">{worker.workerId}</td>
                      <td className="py-3 px-4 text-white font-medium">{worker.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-slate-700 text-slate-300">
                          {worker.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          worker.totalViolations >= 10 ? 'bg-red-500/20 text-red-400' :
                          worker.totalViolations >= 5 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {worker.totalViolations}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                          {worker.ppeViolations}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                          {worker.zoneViolations}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                worker.complianceScore >= 70 ? 'bg-green-500' :
                                worker.complianceScore >= 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${worker.complianceScore}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-medium ${
                            worker.complianceScore >= 70 ? 'text-green-400' :
                            worker.complianceScore >= 50 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {worker.complianceScore}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-sm">
                        {new Date(worker.lastViolation).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {worker.repeatOffender ? (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 flex items-center gap-1 justify-center">
                            <AlertTriangle className="w-3 h-3" />
                            Repeat
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Safety Insights Section */}
        <div className="card p-6 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Safety Insights & Recommendations</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Repeat Offenders Insight */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-red-500/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold text-white">Repeat Offenders</h3>
              </div>
              <p className="text-2xl font-bold text-red-400 mb-2">
                {workerData.filter(w => w.repeatOffender).length}
              </p>
              <p className="text-sm text-slate-400 mb-3">
                Workers with 8+ violations need immediate attention
              </p>
              <div className="space-y-1">
                {workerData.filter(w => w.repeatOffender).slice(0, 3).map(w => (
                  <div key={w.workerId} className="text-xs text-slate-300 flex justify-between">
                    <span>{w.name}</span>
                    <span className="text-red-400 font-medium">{w.totalViolations}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone Violations Insight */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-orange-400" />
                <h3 className="font-semibold text-white">Zone Violations</h3>
              </div>
              <p className="text-2xl font-bold text-orange-400 mb-2">
                {workerData.reduce((sum, w) => sum + w.zoneViolations, 0)}
              </p>
              <p className="text-sm text-slate-400 mb-3">
                Total restricted zone entries
              </p>
              <div className="space-y-1">
                {workerData.sort((a, b) => b.zoneViolations - a.zoneViolations).slice(0, 3).map(w => (
                  <div key={w.workerId} className="text-xs text-slate-300 flex justify-between">
                    <span>{w.name}</span>
                    <span className="text-orange-400 font-medium">{w.zoneViolations}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* High Compliance Workers */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-green-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-white">High Compliance</h3>
              </div>
              <p className="text-2xl font-bold text-green-400 mb-2">
                {workerData.filter(w => w.complianceScore >= 70).length}
              </p>
              <p className="text-sm text-slate-400 mb-3">
                Workers with 70%+ compliance score
              </p>
              <div className="space-y-1">
                {workerData.filter(w => w.complianceScore >= 70).slice(0, 3).map(w => (
                  <div key={w.workerId} className="text-xs text-slate-300 flex justify-between">
                    <span>{w.name}</span>
                    <span className="text-green-400 font-medium">{w.complianceScore}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="mt-6 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Recommended Actions
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>Schedule mandatory safety training for workers with 8+ violations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>Review zone access permissions for frequent zone violators</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>Recognize and reward workers with high compliance scores</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>Investigate root causes for workers with declining compliance trends</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
