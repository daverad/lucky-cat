/**
 * Lucky Cat - Revenue Forecasting Logic
 * Calculates projections based on historical patterns
 */

const LCForecasting = {
  /**
   * Current data granularity
   */
  granularity: 'daily',

  /**
   * Calculate all forecasts from revenue data
   * @param {Array} dailyData - Array of {date, revenue, granularity?} objects
   * @param {string} granularity - Data granularity: 'daily', 'weekly', or 'monthly'
   * @returns {Object} Forecast results
   */
  calculateForecasts(dailyData, granularity = null) {
    if (!dailyData || dailyData.length < 3) {
      // Removed for production('LC Forecasting: Not enough data, need at least 3 data points');
      return null;
    }

    // Detect granularity from data if not provided
    if (granularity) {
      this.granularity = granularity;
    } else if (dailyData[0]?.granularity) {
      this.granularity = dailyData[0].granularity;
    } else {
      this.granularity = this.detectGranularityFromData(dailyData);
    }

    // Removed for production('LC Forecasting: Calculating with', dailyData.length, 'data points, granularity:', this.granularity);

    // Sort data by date
    const sortedData = [...dailyData].sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    // For monthly data, we need different calculations
    if (this.granularity === 'monthly') {
      return this.calculateMonthlyForecasts(sortedData);
    }

    return {
      currentMonth: this.forecastCurrentMonth(sortedData),
      nextMonth: this.forecastNextMonth(sortedData),
      ytd: this.calculateYTDComparison(sortedData),
      fullYear: this.calculateFullYearForecast(sortedData),
      patterns: this.analyzeDailyPatterns(sortedData),
      insight: this.generateInsight(sortedData),
      granularity: this.granularity
    };
  },

  /**
   * Detect granularity from the data itself
   * @param {Array} data
   * @returns {string}
   */
  detectGranularityFromData(data) {
    if (data.length < 2) return 'daily';

    const date1 = new Date(data[0].date);
    const date2 = new Date(data[1].date);
    const diffDays = Math.abs((date2 - date1) / (1000 * 60 * 60 * 24));

    if (diffDays >= 28) return 'monthly';
    if (diffDays >= 6) return 'weekly';
    return 'daily';
  },

  /**
   * Calculate forecasts for monthly granularity data
   * @param {Array} monthlyData
   * @returns {Object}
   */
  calculateMonthlyForecasts(monthlyData) {
    // Removed for production('LC Forecasting: Using monthly calculation mode');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });

    // Get the most recent complete months
    const recentMonths = monthlyData.slice(-12);

    // Find current month's data if available
    const currentMonthData = monthlyData.find(d => {
      const date = new Date(d.date);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });

    // Find same month last year
    const lastYearSameMonth = monthlyData.find(d => {
      const date = new Date(d.date);
      return date.getFullYear() === currentYear - 1 && date.getMonth() === currentMonth;
    });

    // Calculate average monthly revenue
    const avgMonthly = this.average(recentMonths.map(d => d.revenue || 0));

    // Project current month (if we have partial data, extrapolate; otherwise use average)
    let currentMonthProjected = avgMonthly;
    let mtdActual = 0;
    let daysRemaining = 0;

    if (currentMonthData) {
      mtdActual = currentMonthData.revenue;
      // If it's a partial month, extrapolate
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const dayOfMonth = now.getDate();
      daysRemaining = daysInMonth - dayOfMonth;

      if (dayOfMonth < daysInMonth - 5) {
        // Extrapolate from MTD
        currentMonthProjected = (mtdActual / dayOfMonth) * daysInMonth;
      } else {
        // Close to end of month, use actual
        currentMonthProjected = mtdActual;
      }
    }

    // Calculate YoY change
    let vsLastYear = null;
    if (lastYearSameMonth && lastYearSameMonth.revenue > 0) {
      vsLastYear = ((currentMonthProjected - lastYearSameMonth.revenue) / lastYearSameMonth.revenue) * 100;
    }

    // Calculate variance for confidence range
    const variance = this.calculateMonthlyVariance(monthlyData);

    // Next month forecast
    let nextMonth = now.getMonth() + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    const nextMonthName = new Date(nextYear, nextMonth, 1).toLocaleDateString('en-US', { month: 'long' });

    // Find next month from last year for seasonality
    const nextMonthLastYear = monthlyData.find(d => {
      const date = new Date(d.date);
      return date.getFullYear() === nextYear - 1 && date.getMonth() === nextMonth;
    });

    // Use the same logic as daily mode - take the HIGHER of:
    // 1. Recent monthly average
    // 2. Last year same month × YoY growth
    const recentMonthlyAvg = this.getRecentMonthlyAverage(monthlyData);
    let projectedFromLastYear = avgMonthly;
    let basedOn = 'Recent monthly average';

    if (nextMonthLastYear && nextMonthLastYear.revenue > 0) {
      const yoyGrowth = this.calculateYoYGrowth(monthlyData);
      projectedFromLastYear = nextMonthLastYear.revenue * yoyGrowth;
    }

    // Use the higher of recent trend vs last year + growth
    let nextMonthProjected;
    if (recentMonthlyAvg > projectedFromLastYear) {
      nextMonthProjected = recentMonthlyAvg;
      basedOn = 'Recent monthly average';
    } else {
      nextMonthProjected = projectedFromLastYear;
      basedOn = nextMonthLastYear ? `${nextMonthName} ${nextYear - 1} + growth` : 'Recent average';
    }

    // Removed for production: LC Forecasting (monthly) next month calculation

    // YTD calculation
    const ytdCurrent = monthlyData
      .filter(d => {
        const date = new Date(d.date);
        return date.getFullYear() === currentYear;
      })
      .reduce((sum, d) => sum + (d.revenue || 0), 0);

    const ytdLastYear = monthlyData
      .filter(d => {
        const date = new Date(d.date);
        return date.getFullYear() === currentYear - 1 && date.getMonth() <= currentMonth;
      })
      .reduce((sum, d) => sum + (d.revenue || 0), 0);

    let ytdPctChange = null;
    if (ytdLastYear > 0) {
      ytdPctChange = ((ytdCurrent - ytdLastYear) / ytdLastYear) * 100;
    }

    // Calculate full year forecast for monthly data
    const fullYearForecast = this.calculateFullYearForecastMonthly(monthlyData, ytdCurrent, ytdLastYear, currentYear);

    return {
      currentMonth: {
        name: monthName,
        projected: Math.round(currentMonthProjected),
        low: Math.round(currentMonthProjected * (1 - variance)),
        high: Math.round(currentMonthProjected * (1 + variance)),
        mtdActual: Math.round(mtdActual),
        daysRemaining: daysRemaining,
        vsLastYear: vsLastYear,
        confidence: daysRemaining < 10 ? 'high' : 'medium',
        calcDetails: {
          monthlyAvg: Math.round(avgMonthly),
          variancePct: Math.round(variance * 100),
          isMonthlyData: true
        }
      },
      nextMonth: {
        name: nextMonthName,
        year: nextYear,
        projected: Math.round(nextMonthProjected),
        low: Math.round(nextMonthProjected * (1 - variance * 1.5)),
        high: Math.round(nextMonthProjected * (1 + variance * 1.5)),
        basedOn: basedOn,
        confidence: 'lower',
        calcDetails: {
          recentMonthlyAvg: Math.round(recentMonthlyAvg),
          variancePct: Math.round(variance * 1.5 * 100),
          isMonthlyData: true
        }
      },
      ytd: {
        current: Math.round(ytdCurrent),
        lastYear: Math.round(ytdLastYear),
        pctChange: ytdPctChange !== null ? Math.round(ytdPctChange * 10) / 10 : null,
        asOf: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        currentYear: currentYear,
        lastYearLabel: currentYear - 1
      },
      fullYear: fullYearForecast,
      patterns: null, // Daily patterns don't apply to monthly data
      insight: this.generateMonthlyInsight(monthlyData),
      granularity: 'monthly',
      note: 'Forecasts based on monthly data. For more accurate daily forecasts, view the daily chart.'
    };
  },

  /**
   * Generate insight for monthly data
   */
  generateMonthlyInsight(monthlyData) {
    if (monthlyData.length < 3) return null;

    const recent = monthlyData.slice(-3);
    const trend = recent[2]?.revenue > recent[0]?.revenue ? 'up' : 'down';
    const trendPct = recent[0]?.revenue > 0
      ? Math.abs(((recent[2]?.revenue - recent[0]?.revenue) / recent[0]?.revenue) * 100)
      : 0;

    if (trendPct > 10) {
      return `Revenue trending ${trend} ${trendPct.toFixed(0)}% over the last 3 months`;
    }

    return null;
  },

  /**
   * Calculate full year forecast for monthly granularity data
   * Uses last year's total × (1 + YTD YoY growth rate)
   * @param {Array} monthlyData - Monthly revenue data
   * @param {number} ytdCurrent - Current YTD revenue
   * @param {number} ytdLastYear - Last year's YTD revenue
   * @param {number} currentYear - Current year
   * @returns {Object} Full year forecast
   */
  calculateFullYearForecastMonthly(monthlyData, ytdCurrent, ytdLastYear, currentYear) {
    const now = new Date();
    const currentMonth = now.getMonth();

    // Get last year's full year total
    const lastYearTotal = monthlyData
      .filter(d => {
        const date = new Date(d.date);
        return date.getFullYear() === currentYear - 1;
      })
      .reduce((sum, d) => sum + (d.revenue || 0), 0);

    // Calculate YoY growth rate from YTD comparison
    let yoyGrowthRate = 0;
    if (ytdLastYear > 0) {
      yoyGrowthRate = (ytdCurrent - ytdLastYear) / ytdLastYear;
    }

    // Full year projection = Last year's total × (1 + YTD YoY growth rate)
    let projected = lastYearTotal * (1 + yoyGrowthRate);

    // If no last year data, fall back to extrapolating YTD
    if (lastYearTotal === 0 && ytdCurrent > 0) {
      const monthsPassed = currentMonth + 1;
      const monthlyAvg = ytdCurrent / monthsPassed;
      projected = monthlyAvg * 12;
    }

    // Range: ±15%
    const variance = 0.15;
    const low = projected * (1 - variance);
    const high = projected * (1 + variance);

    return {
      projected: Math.round(projected),
      low: Math.round(low),
      high: Math.round(high),
      lastYearTotal: Math.round(lastYearTotal),
      currentYear,
      yoyGrowthRate: Math.round(yoyGrowthRate * 100)
    };
  },

  /**
   * Forecast current month's final revenue
   * @param {Array} data - Sorted daily revenue data
   * @returns {Object} Current month forecast
   */
  forecastCurrentMonth(data) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const today = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysRemaining = daysInMonth - today;

    // Get month name
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });

    // Calculate MTD actual from data
    const mtdData = data.filter(d => {
      const date = new Date(d.date);
      return date.getFullYear() === currentYear &&
             date.getMonth() === currentMonth &&
             date.getDate() <= today;
    });

    const mtdActual = mtdData.reduce((sum, d) => sum + (d.revenue || 0), 0);

    // Use recent daily average to project remaining days
    // This is more robust than historical day-of-month when we have limited data
    const recentDailyAvg = this.getRecentDailyAverage(data, 15);
    const remainingForecast = recentDailyAvg * daysRemaining;

    // Project total: MTD actual + remaining days forecast
    const projected = mtdActual + remainingForecast;

    // Removed for production: LC Forecasting current month calculation

    // Calculate confidence range based on variance
    const variance = this.calculateMonthlyVariance(data);
    const low = Math.max(0, projected * (1 - variance));
    const high = projected * (1 + variance);

    // Calculate vs last year same month (YoY)
    const lastYearSameMonth = this.getMonthTotal(data, currentMonth, currentYear - 1);
    let vsLastYear = null;
    if (lastYearSameMonth > 0) {
      vsLastYear = ((projected - lastYearSameMonth) / lastYearSameMonth) * 100;
    }

    // Calculate vs last month (MoM)
    let lastMonth = currentMonth - 1;
    let lastMonthYear = currentYear;
    if (lastMonth < 0) {
      lastMonth = 11;
      lastMonthYear = currentYear - 1;
    }
    const lastMonthTotal = this.getMonthTotal(data, lastMonth, lastMonthYear);
    const lastMonthName = new Date(lastMonthYear, lastMonth, 1).toLocaleDateString('en-US', { month: 'long' });
    let vsMoM = null;
    if (lastMonthTotal > 0) {
      vsMoM = ((projected - lastMonthTotal) / lastMonthTotal) * 100;
    }

    return {
      name: monthName,
      projected: Math.round(projected),
      low: Math.round(low),
      high: Math.round(high),
      mtdActual: Math.round(mtdActual),
      daysRemaining: daysRemaining,
      vsLastYear,
      lastYearAmount: Math.round(lastYearSameMonth),
      vsMoM,
      lastMonthAmount: Math.round(lastMonthTotal),
      lastMonthName,
      confidence: this.getConfidenceLevel(daysRemaining),
      // Calculation details for tooltip
      calcDetails: {
        dailyAvg: Math.round(recentDailyAvg),
        variancePct: Math.round(variance * 100)
      }
    };
  },

  /**
   * Forecast next month's revenue
   * @param {Array} data - Sorted daily revenue data
   * @returns {Object} Next month forecast
   */
  forecastNextMonth(data) {
    const now = new Date();
    let nextMonth = now.getMonth() + 1;
    let nextYear = now.getFullYear();

    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }

    const monthName = new Date(nextYear, nextMonth, 1).toLocaleDateString('en-US', { month: 'long' });
    const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();

    // Primary method: Use recent daily average * days in month
    // This is more accurate for growing apps than comparing to last year
    const recentDailyAvg = this.getRecentDailyAverage(data, 15); // Last 15 days (excluding today)
    const projectedFromRecent = recentDailyAvg * daysInNextMonth;

    // Secondary: Get same month from last year for comparison
    const lastYearSameMonth = this.getMonthTotal(data, nextMonth, nextYear - 1);

    // Use the higher of: recent projection or last year + growth
    let projected = projectedFromRecent;
    let basedOn = 'Recent 15-day average';

    if (lastYearSameMonth > 0) {
      const yoyGrowth = this.calculateYoYGrowth(data);
      const projectedFromLastYear = lastYearSameMonth * yoyGrowth;

      // Removed for production: LC Forecasting next month projections

      // Use the higher projection (recent trend usually more relevant for growing apps)
      if (projectedFromRecent > projectedFromLastYear) {
        projected = projectedFromRecent;
        basedOn = 'Recent 15-day average';
      } else {
        projected = projectedFromLastYear;
        basedOn = `${monthName} ${nextYear - 1} + growth`;
      }
    }

    // Wider confidence range for future month
    const variance = this.calculateMonthlyVariance(data);
    const low = projected * (1 - variance);
    const high = projected * (1 + variance);

    return {
      name: monthName,
      year: nextYear,
      projected: Math.round(projected),
      low: Math.round(low),
      high: Math.round(high),
      basedOn: basedOn,
      confidence: 'lower', // Next month always lower confidence
      // Calculation details for tooltip
      calcDetails: {
        dailyAvg: Math.round(recentDailyAvg),
        daysInMonth: daysInNextMonth,
        variancePct: Math.round(variance * 100)
      }
    };
  },

  /**
   * Calculate full year forecast
   * Uses last year's total × (1 + YTD YoY growth rate)
   * This ensures the full year forecast growth matches YTD growth
   * @param {Array} data - Sorted daily revenue data
   * @returns {Object} Full year forecast
   */
  calculateFullYearForecast(data) {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Get last year's full year total
    const lastYearTotal = data
      .filter(d => {
        const date = new Date(d.date);
        return date.getFullYear() === currentYear - 1;
      })
      .reduce((sum, d) => sum + (d.revenue || 0), 0);

    // Get YTD current year revenue
    const ytdCurrent = data
      .filter(d => {
        const date = new Date(d.date);
        return date.getFullYear() === currentYear && date <= now;
      })
      .reduce((sum, d) => sum + (d.revenue || 0), 0);

    // Get last year's YTD (same period) for YoY growth calculation
    const sameTimeLastYear = new Date(currentYear - 1, now.getMonth(), now.getDate());
    const ytdLastYear = data
      .filter(d => {
        const date = new Date(d.date);
        return date.getFullYear() === currentYear - 1 && date <= sameTimeLastYear;
      })
      .reduce((sum, d) => sum + (d.revenue || 0), 0);

    // Calculate YoY growth rate from YTD comparison
    let yoyGrowthRate = 0;
    if (ytdLastYear > 0) {
      yoyGrowthRate = (ytdCurrent - ytdLastYear) / ytdLastYear;
    }

    // Full year projection = Last year's total × (1 + YTD YoY growth rate)
    // This ensures the full year % change matches the YTD % change
    let projected = lastYearTotal * (1 + yoyGrowthRate);

    // If no last year data, fall back to extrapolating YTD
    if (lastYearTotal === 0 && ytdCurrent > 0) {
      const startOfYear = new Date(currentYear, 0, 1);
      const daysPassed = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
      const dailyAvg = ytdCurrent / daysPassed;
      projected = dailyAvg * 365;
    }

    // Range: ±15%
    const variance = 0.15;
    const low = projected * (1 - variance);
    const high = projected * (1 + variance);

    return {
      projected: Math.round(projected),
      low: Math.round(low),
      high: Math.round(high),
      lastYearTotal: Math.round(lastYearTotal),
      currentYear,
      yoyGrowthRate: Math.round(yoyGrowthRate * 100)
    };
  },

  /**
   * Calculate YTD comparison
   * @param {Array} data - Sorted daily revenue data
   * @returns {Object} YTD comparison
   */
  calculateYTDComparison(data) {
    const now = new Date();
    const currentYear = now.getFullYear();

    // YTD current year
    const ytdCurrent = data
      .filter(d => {
        const date = new Date(d.date);
        return date.getFullYear() === currentYear && date <= now;
      })
      .reduce((sum, d) => sum + (d.revenue || 0), 0);

    // YTD last year (same period)
    const sameTimeLastYear = new Date(currentYear - 1, now.getMonth(), now.getDate());
    const ytdLastYear = data
      .filter(d => {
        const date = new Date(d.date);
        return date.getFullYear() === currentYear - 1 && date <= sameTimeLastYear;
      })
      .reduce((sum, d) => sum + (d.revenue || 0), 0);

    // Calculate percentage change
    let pctChange = null;
    if (ytdLastYear > 0) {
      pctChange = ((ytdCurrent - ytdLastYear) / ytdLastYear) * 100;
    }

    return {
      current: Math.round(ytdCurrent),
      lastYear: Math.round(ytdLastYear),
      pctChange: pctChange !== null ? Math.round(pctChange * 10) / 10 : null,
      asOf: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      currentYear,
      lastYearLabel: currentYear - 1
    };
  },

  /**
   * Analyze daily patterns in revenue
   * @param {Array} data - Sorted daily revenue data
   * @returns {Object} Pattern analysis
   */
  analyzeDailyPatterns(data) {
    const dayOfMonthRevenues = {};
    const dayOfWeekRevenues = { weekday: [], weekend: [] };

    // Group by day of month and day of week
    data.forEach(d => {
      const date = new Date(d.date);
      const dayOfMonth = date.getDate();
      const dayOfWeek = date.getDay();
      const revenue = d.revenue || 0;

      if (!dayOfMonthRevenues[dayOfMonth]) {
        dayOfMonthRevenues[dayOfMonth] = [];
      }
      dayOfMonthRevenues[dayOfMonth].push(revenue);

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dayOfWeekRevenues.weekend.push(revenue);
      } else {
        dayOfWeekRevenues.weekday.push(revenue);
      }
    });

    // Calculate overall daily average
    const allRevenues = data.map(d => d.revenue || 0);
    const overallAvg = this.average(allRevenues);

    // Find patterns by day of month
    const patterns = {};
    for (const [day, revenues] of Object.entries(dayOfMonthRevenues)) {
      const avg = this.average(revenues);
      const relative = overallAvg > 0 ? avg / overallAvg : 1;
      patterns[day] = {
        average: Math.round(avg),
        relative: Math.round(relative * 100) / 100,
        isHigh: relative > 1.1,
        isLow: relative < 0.9
      };
    }

    // Weekend vs weekday
    const weekendAvg = this.average(dayOfWeekRevenues.weekend);
    const weekdayAvg = this.average(dayOfWeekRevenues.weekday);

    return {
      byDay: patterns,
      weekendAvg: Math.round(weekendAvg),
      weekdayAvg: Math.round(weekdayAvg),
      weekendVsWeekday: weekdayAvg > 0 ? Math.round((weekendAvg / weekdayAvg) * 100) / 100 : 1,
      bestDay: this.findBestDay(patterns),
      worstDay: this.findWorstDay(patterns)
    };
  },

  /**
   * Generate insight based on patterns
   * @param {Array} data - Revenue data
   * @returns {string|null} Insight text
   */
  generateInsight(data) {
    const patterns = this.analyzeDailyPatterns(data);
    const insights = [];

    // Day 1 insight (subscription renewals)
    if (patterns.byDay[1] && patterns.byDay[1].relative > 1.5) {
      insights.push(`Day 1 of month typically ${patterns.byDay[1].relative.toFixed(1)}x average (likely renewal day)`);
    }

    // Best day insight
    if (patterns.bestDay && patterns.byDay[patterns.bestDay].relative > 1.3) {
      insights.push(`Day ${patterns.bestDay} performs ${patterns.byDay[patterns.bestDay].relative.toFixed(1)}x above average`);
    }

    // Weekend vs weekday
    if (patterns.weekendVsWeekday < 0.7) {
      insights.push(`Weekend revenue is ${Math.round((1 - patterns.weekendVsWeekday) * 100)}% lower than weekdays`);
    } else if (patterns.weekendVsWeekday > 1.3) {
      insights.push(`Weekend revenue is ${Math.round((patterns.weekendVsWeekday - 1) * 100)}% higher than weekdays`);
    }

    return insights.length > 0 ? insights[0] : null;
  },

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get historical average for a specific day of month
   */
  getHistoricalDayAverage(data, dayOfMonth, monthIndex) {
    const relevantData = data.filter(d => {
      const date = new Date(d.date);
      return date.getDate() === dayOfMonth;
      // Optionally filter by same month: && date.getMonth() === monthIndex
    });

    if (relevantData.length === 0) {
      return this.average(data.map(d => d.revenue || 0));
    }

    return this.average(relevantData.map(d => d.revenue || 0));
  },

  /**
   * Calculate YoY growth rate
   */
  calculateYoYGrowth(data) {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Get last 12 months revenue
    const last12Months = data.filter(d => {
      const date = new Date(d.date);
      const monthsAgo = (currentYear - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
      return monthsAgo >= 0 && monthsAgo < 12;
    });

    // Get 12-24 months ago revenue
    const previous12Months = data.filter(d => {
      const date = new Date(d.date);
      const monthsAgo = (currentYear - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
      return monthsAgo >= 12 && monthsAgo < 24;
    });

    const recentTotal = last12Months.reduce((sum, d) => sum + (d.revenue || 0), 0);
    const previousTotal = previous12Months.reduce((sum, d) => sum + (d.revenue || 0), 0);

    if (previousTotal > 0 && recentTotal > 0) {
      return recentTotal / previousTotal;
    }

    return 1; // No growth if insufficient data
  },

  /**
   * Get total revenue for a specific month/year
   */
  getMonthTotal(data, monthIndex, year) {
    return data
      .filter(d => {
        const date = new Date(d.date);
        return date.getMonth() === monthIndex && date.getFullYear() === year;
      })
      .reduce((sum, d) => sum + (d.revenue || 0), 0);
  },

  /**
   * Get recent daily average (last N days, excluding today)
   */
  getRecentDailyAverage(data, days = 15) {
    // Exclude today (current date may have incomplete data)
    const today = new Date().toISOString().split('T')[0];
    const dataExcludingToday = data.filter(d => d.date !== today);

    // Get the most recent N data points
    const recentData = dataExcludingToday.slice(-days);

    if (recentData.length === 0) {
      return this.average(data.map(d => d.revenue || 0));
    }

    const avg = this.average(recentData.map(d => d.revenue || 0));
    // Removed for production: LC Forecasting recent days average calculation
    return avg;
  },

  /**
   * Get recent monthly average
   */
  getRecentMonthlyAverage(data) {
    const now = new Date();
    const monthlyTotals = [];

    for (let i = 1; i <= 6; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = this.getMonthTotal(data, targetDate.getMonth(), targetDate.getFullYear());
      if (total > 0) {
        monthlyTotals.push(total);
      }
    }

    return monthlyTotals.length > 0 ? this.average(monthlyTotals) : 0;
  },

  /**
   * Variance override setting (0 = auto, or 10/20/30/40/50)
   */
  varianceOverride: 0,

  /**
   * Set variance override
   */
  setVarianceOverride(value) {
    this.varianceOverride = value || 0;
  },

  /**
   * Calculate monthly variance
   */
  calculateMonthlyVariance(data) {
    // If user has set a manual variance override, use it
    if (this.varianceOverride > 0) {
      return this.varianceOverride / 100;
    }

    const monthlyTotals = [];
    const now = new Date();

    // Use last 6 months for variance calculation (more responsive to recent changes)
    for (let i = 1; i <= 6; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = this.getMonthTotal(data, targetDate.getMonth(), targetDate.getFullYear());
      if (total > 0) {
        monthlyTotals.push(total);
      }
    }

    if (monthlyTotals.length < 2) return 0.2; // Default 20% variance

    const avg = this.average(monthlyTotals);
    const variance = this.stdDev(monthlyTotals) / avg;

    return Math.min(variance, 0.5); // Cap at 50%
  },

  /**
   * Calculate standard deviation
   */
  calculateStdDev(values) {
    return this.stdDev(values);
  },

  /**
   * Standard deviation helper
   */
  stdDev(values) {
    if (values.length < 2) return 0;
    const avg = this.average(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  },

  /**
   * Average helper
   */
  average(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  },

  /**
   * Find the best performing day of month
   */
  findBestDay(patterns) {
    let bestDay = null;
    let bestRelative = 0;

    for (const [day, data] of Object.entries(patterns)) {
      if (data.relative > bestRelative) {
        bestRelative = data.relative;
        bestDay = parseInt(day);
      }
    }

    return bestDay;
  },

  /**
   * Find the worst performing day of month
   */
  findWorstDay(patterns) {
    let worstDay = null;
    let worstRelative = Infinity;

    for (const [day, data] of Object.entries(patterns)) {
      if (data.relative < worstRelative) {
        worstRelative = data.relative;
        worstDay = parseInt(day);
      }
    }

    return worstDay;
  },

  /**
   * Get confidence level based on remaining days
   */
  getConfidenceLevel(remainingDays) {
    if (remainingDays <= 5) return 'high';
    if (remainingDays <= 15) return 'medium';
    return 'lower';
  }
};

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.LCForecasting = LCForecasting;
}
