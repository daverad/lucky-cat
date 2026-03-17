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
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });

    // Get the most recent complete months
    const recentMonths = monthlyData.slice(-12);
    const avgMonthly = this.average(recentMonths.map(d => d.revenue || 0));

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

    // ── Current Month: Blended projection ──
    let mtdActual = 0;
    let daysRemaining = 0;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const monthProgress = dayOfMonth / daysInMonth;

    // Signal 1: MTD extrapolation (always available if we have current month data)
    let signal1_total = avgMonthly;
    if (currentMonthData) {
      mtdActual = currentMonthData.revenue;
      daysRemaining = daysInMonth - dayOfMonth;
      if (dayOfMonth < daysInMonth - 5) {
        signal1_total = (mtdActual / dayOfMonth) * daysInMonth;
      } else {
        signal1_total = mtdActual;
      }
    }

    // Signal 2: Same month last year x blended YoY growth
    let signal2_total = null;
    if (lastYearSameMonth && lastYearSameMonth.revenue > 0) {
      const blendedGrowth = this.calculateBlendedYoYGrowth(monthlyData);
      signal2_total = lastYearSameMonth.revenue * blendedGrowth.multiplier;

      // Pacing refinement if we have MTD data and enough of the month has passed
      if (currentMonthData && monthProgress > 0.15) {
        const lastYearMTDEntry = monthlyData.find(d => {
          const date = new Date(d.date);
          return date.getFullYear() === currentYear - 1 && date.getMonth() === currentMonth;
        });
        if (lastYearMTDEntry && lastYearMTDEntry.revenue > 0) {
          // For monthly data, estimate pacing based on proportional MTD
          const lastYearFullMonth = lastYearMTDEntry.revenue;
          const pacingProjection = lastYearFullMonth * (signal1_total / mtdActual) * (mtdActual / lastYearFullMonth);
          signal2_total = signal2_total * (1 - monthProgress) + pacingProjection * monthProgress;
        }
      }
    }

    // Signal 3: MoM trajectory
    let signal3_total = null;
    const momTrend = this.calculateMoMTrend(monthlyData, 6);
    if (momTrend && momTrend.r2 > 0.3) {
      signal3_total = momTrend.projectedCurrentMonth;
    }

    // Adaptive weights for current month
    let cw1, cw2, cw3;
    if (signal2_total !== null && signal3_total !== null) {
      cw1 = 0.30 + monthProgress * 0.40;
      cw2 = 0.45 - monthProgress * 0.25;
      cw3 = 0.25 - monthProgress * 0.15;
    } else if (signal2_total !== null) {
      cw1 = 0.40 + monthProgress * 0.35;
      cw2 = 0.60 - monthProgress * 0.35;
      cw3 = 0;
    } else if (signal3_total !== null) {
      cw1 = 0.60 + monthProgress * 0.20;
      cw2 = 0;
      cw3 = 0.40 - monthProgress * 0.20;
    } else {
      cw1 = 1.0; cw2 = 0; cw3 = 0;
    }
    const cwTotal = cw1 + cw2 + cw3;
    cw1 /= cwTotal; cw2 /= cwTotal; cw3 /= cwTotal;

    const currentMonthProjected = cw1 * signal1_total
                                + cw2 * (signal2_total || signal1_total)
                                + cw3 * (signal3_total || signal1_total);

    // Current month variance
    const currentSignals = [signal1_total];
    if (signal2_total !== null) currentSignals.push(signal2_total);
    if (signal3_total !== null) currentSignals.push(signal3_total);
    const currentSpread = currentSignals.length > 1
      ? this.stdDev(currentSignals) / this.average(currentSignals) : 0;

    const baseVariance = this.calculateMonthlyVariance(monthlyData);
    const currentVariance = daysRemaining > 0
      ? Math.min(Math.sqrt(Math.pow(baseVariance, 2) + Math.pow(currentSpread * 0.5, 2)) * Math.sqrt(daysRemaining / daysInMonth), 0.5)
      : 0;

    const currentRemaining = currentMonthProjected - mtdActual;

    // YoY change
    let vsLastYear = null;
    if (lastYearSameMonth && lastYearSameMonth.revenue > 0) {
      vsLastYear = ((currentMonthProjected - lastYearSameMonth.revenue) / lastYearSameMonth.revenue) * 100;
    }

    // ── Next Month: Blended with YoY-heavy weights ──
    let nextMonth = now.getMonth() + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }
    const nextMonthName = new Date(nextYear, nextMonth, 1).toLocaleDateString('en-US', { month: 'long' });

    const nextMonthLastYear = monthlyData.find(d => {
      const date = new Date(d.date);
      return date.getFullYear() === nextYear - 1 && date.getMonth() === nextMonth;
    });

    // Next month signals
    let nm_signal1 = null; // YoY
    if (nextMonthLastYear && nextMonthLastYear.revenue > 0) {
      const blendedGrowth = this.calculateBlendedYoYGrowth(monthlyData);
      nm_signal1 = nextMonthLastYear.revenue * blendedGrowth.multiplier;
    }

    let nm_signal2 = null; // MoM trend
    if (momTrend && momTrend.r2 > 0.3) {
      nm_signal2 = momTrend.projectedNextMonth;
    }

    const recentMonthlyAvg = this.getRecentMonthlyAverage(monthlyData);
    const seasonalIndex = this.calculateSeasonalIndex(monthlyData, nextMonth);
    const nm_signal3 = recentMonthlyAvg > 0 ? recentMonthlyAvg * seasonalIndex : avgMonthly;

    // Next month adaptive weights
    let nw1 = 0, nw2 = 0, nw3 = 0;
    let basedOn = '';
    if (nm_signal1 !== null && nm_signal2 !== null) {
      nw1 = 0.45; nw2 = 0.30; nw3 = 0.25;
      basedOn = 'YoY growth + trajectory + seasonal';
    } else if (nm_signal1 !== null) {
      nw1 = 0.55; nw3 = 0.45;
      basedOn = `${nextMonthName} ${nextYear - 1} + growth`;
    } else if (nm_signal2 !== null) {
      nw2 = 0.50; nw3 = 0.50;
      basedOn = 'Monthly trajectory + seasonal average';
    } else {
      nw3 = 1.0;
      basedOn = 'Recent monthly average';
    }
    const nwTotal = nw1 + nw2 + nw3;
    nw1 /= nwTotal; nw2 /= nwTotal; nw3 /= nwTotal;

    const nextMonthProjected = nw1 * (nm_signal1 || 0)
                             + nw2 * (nm_signal2 || 0)
                             + nw3 * nm_signal3;

    // Next month variance
    const nextSignals = [nm_signal3];
    if (nm_signal1 !== null) nextSignals.push(nm_signal1);
    if (nm_signal2 !== null) nextSignals.push(nm_signal2);
    const nextSpread = nextSignals.length > 1
      ? this.stdDev(nextSignals) / this.average(nextSignals) : 0;
    const nextVariance = Math.min(
      Math.sqrt(Math.pow(baseVariance * 1.3, 2) + Math.pow(nextSpread * 0.5, 2)),
      0.5
    );

    // ── YTD calculation ──
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

    const fullYearForecast = this.calculateFullYearForecastMonthly(monthlyData, ytdCurrent, ytdLastYear, currentYear);

    return {
      currentMonth: {
        name: monthName,
        projected: Math.round(currentMonthProjected),
        low: Math.round(mtdActual + Math.max(0, currentRemaining) * (1 - currentVariance)),
        high: Math.round(mtdActual + Math.max(0, currentRemaining) * (1 + currentVariance)),
        mtdActual: Math.round(mtdActual),
        daysRemaining,
        vsLastYear,
        confidence: daysRemaining < 10 ? 'high' : 'medium',
        calcDetails: {
          monthlyAvg: Math.round(avgMonthly),
          variancePct: Math.round(currentVariance * 100),
          isMonthlyData: true,
          signals: {
            extrapolation: { value: Math.round(signal1_total), weight: Math.round(cw1 * 100) },
            seasonalYoY: signal2_total !== null
              ? { value: Math.round(signal2_total), weight: Math.round(cw2 * 100) }
              : null,
            momTrend: signal3_total !== null
              ? { value: Math.round(signal3_total), weight: Math.round(cw3 * 100) }
              : null
          },
          signalAgreement: currentSignals.length > 1
            ? (currentSpread < 0.05 ? 'high' : currentSpread < 0.15 ? 'medium' : 'low')
            : 'single-signal'
        }
      },
      nextMonth: {
        name: nextMonthName,
        year: nextYear,
        projected: Math.round(nextMonthProjected),
        low: Math.round(nextMonthProjected * (1 - nextVariance)),
        high: Math.round(nextMonthProjected * (1 + nextVariance)),
        basedOn,
        confidence: 'lower',
        calcDetails: {
          recentMonthlyAvg: Math.round(recentMonthlyAvg),
          variancePct: Math.round(nextVariance * 100),
          isMonthlyData: true,
          seasonalIndex: Math.round(seasonalIndex * 100) / 100,
          signals: {
            seasonalYoY: nm_signal1 !== null
              ? { value: Math.round(nm_signal1), weight: Math.round(nw1 * 100) }
              : null,
            momTrend: nm_signal2 !== null
              ? { value: Math.round(nm_signal2), weight: Math.round(nw2 * 100) }
              : null,
            seasonalAvg: { value: Math.round(nm_signal3), weight: Math.round(nw3 * 100) }
          },
          signalAgreement: nextSignals.length > 1
            ? (nextSpread < 0.05 ? 'high' : nextSpread < 0.15 ? 'medium' : 'low')
            : 'single-signal'
        }
      },
      ytd: {
        current: Math.round(ytdCurrent),
        lastYear: Math.round(ytdLastYear),
        pctChange: ytdPctChange !== null ? Math.round(ytdPctChange * 10) / 10 : null,
        asOf: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        currentYear,
        lastYearLabel: currentYear - 1
      },
      fullYear: fullYearForecast,
      patterns: null,
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

    // Apply variance only to the uncertain remaining portion of the year
    // Scale variance up as fewer months remain (less averaging of monthly fluctuations)
    const monthsRemaining = 12 - (currentMonth + 1);
    const baseVariance = this.calculateMonthlyVariance(monthlyData);
    const variance = monthsRemaining > 0
      ? Math.min(baseVariance * Math.sqrt(12 / monthsRemaining), 1.5)
      : 0;
    const remainingProjection = Math.max(0, projected - ytdCurrent);
    const low = ytdCurrent + remainingProjection * (1 - variance);
    const high = ytdCurrent + remainingProjection * (1 + variance);

    // Build calcDetails for the info tooltip
    const method = lastYearTotal > 0 ? 'yoy' : 'extrapolation';
    const calcDetails = { variancePct: Math.round(variance * 100), signals: {} };
    if (method === 'yoy') {
      calcDetails.signals.lastYearTotal = { value: Math.round(lastYearTotal), weight: 100, label: 'Last year total' };
      calcDetails.method = `Last year \u00D7 (1 + ${Math.round(yoyGrowthRate * 100)}% YTD YoY growth)`;
    } else {
      calcDetails.signals.ytdExtrapolation = { value: Math.round(projected), weight: 100, label: 'YTD monthly avg \u00D7 12' };
      calcDetails.method = 'YTD monthly average extrapolated to full year';
    }
    calcDetails.signalAgreement = 'single-signal';

    return {
      projected: Math.round(projected),
      low: Math.round(low),
      high: Math.round(high),
      lastYearTotal: Math.round(lastYearTotal),
      currentYear,
      yoyGrowthRate: Math.round(yoyGrowthRate * 100),
      calcDetails
    };
  },

  /**
   * Forecast current month's final revenue
   * Uses a weighted blend of 3 signals:
   *   1. Recent 30-day daily average (always available)
   *   2. Same month last year x blended YoY growth + MTD pacing (if YoY data exists)
   *   3. MoM trajectory extrapolation (if linear fit is decent)
   * Weights adapt based on month progress, data availability, and seasonal consistency.
   *
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
    const monthProgress = today / daysInMonth;
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });

    // ── MTD Actual ──
    const mtdData = data.filter(d => {
      const date = new Date(d.date);
      return date.getFullYear() === currentYear &&
             date.getMonth() === currentMonth &&
             date.getDate() <= today;
    });
    const mtdActual = mtdData.reduce((sum, d) => sum + (d.revenue || 0), 0);

    // ── Data Availability ──
    const availability = this.getDataAvailability(data);

    // ══════════════════════════════════════════════
    // SIGNAL 1: Recent Daily Average (30-day window)
    // ══════════════════════════════════════════════
    const recentDailyAvg = this.getRecentDailyAverage(data, 30);
    const signal1_total = mtdActual + recentDailyAvg * daysRemaining;

    // ══════════════════════════════════════════════
    // SIGNAL 2: Same Month Last Year x YoY Growth + MTD Pacing
    // ══════════════════════════════════════════════
    let signal2_total = null;
    const lastYearSameMonthTotal = this.getMonthTotal(data, currentMonth, currentYear - 1);

    if (lastYearSameMonthTotal > 0) {
      const blendedGrowth = this.calculateBlendedYoYGrowth(data);
      signal2_total = lastYearSameMonthTotal * blendedGrowth.multiplier;

      // Refine with MTD pacing comparison once we have enough data (~5+ days)
      if (monthProgress > 0.15) {
        const lastYearMTD = data.filter(d => {
          const date = new Date(d.date);
          return date.getFullYear() === currentYear - 1 &&
                 date.getMonth() === currentMonth &&
                 date.getDate() <= today;
        }).reduce((sum, d) => sum + (d.revenue || 0), 0);

        if (lastYearMTD > 0) {
          const pacingRatio = mtdActual / lastYearMTD;
          const pacingProjection = lastYearSameMonthTotal * pacingRatio;
          // As month progresses, trust pacing more than pure growth projection
          signal2_total = signal2_total * (1 - monthProgress) + pacingProjection * monthProgress;
        }
      }
    }

    // ══════════════════════════════════════════════
    // SIGNAL 3: MoM Trajectory Extrapolation
    // ══════════════════════════════════════════════
    let signal3_total = null;
    const momTrend = this.calculateMoMTrend(data, 6);
    if (momTrend && momTrend.r2 > 0.3) {
      signal3_total = momTrend.projectedCurrentMonth;
    }

    // ══════════════════════════════════════════════
    // ADAPTIVE WEIGHT CALCULATION
    // ══════════════════════════════════════════════
    let w1, w2, w3;

    if (signal2_total !== null && signal3_total !== null) {
      // All three signals available
      w1 = 0.30 + monthProgress * 0.40;  // 0.30 -> 0.70
      w2 = 0.45 - monthProgress * 0.25;  // 0.45 -> 0.20
      w3 = 0.25 - monthProgress * 0.15;  // 0.25 -> 0.10

      // Boost seasonal weight if seasonal pattern is consistent
      const seasonalConsistency = this.calculateSeasonalConsistency(data, currentMonth);
      if (seasonalConsistency > 0.7) {
        const boost = 0.10 * seasonalConsistency;
        w2 += boost;
        w1 -= boost * 0.6;
        w3 -= boost * 0.4;
      }

      // Boost MoM trend if fit is very good
      if (momTrend.r2 > 0.8) {
        w3 += 0.05;
        w1 -= 0.05;
      }
    } else if (signal2_total !== null) {
      w1 = 0.40 + monthProgress * 0.35;
      w2 = 0.60 - monthProgress * 0.35;
      w3 = 0;
    } else if (signal3_total !== null) {
      w1 = 0.60 + monthProgress * 0.20;
      w2 = 0;
      w3 = 0.40 - monthProgress * 0.20;
    } else {
      w1 = 1.0;
      w2 = 0;
      w3 = 0;
    }

    // Normalize weights
    const wTotal = w1 + w2 + w3;
    w1 /= wTotal;
    w2 /= wTotal;
    w3 /= wTotal;

    // ══════════════════════════════════════════════
    // FINAL BLENDED PROJECTION
    // ══════════════════════════════════════════════
    const projected = w1 * signal1_total
                    + w2 * (signal2_total || signal1_total)
                    + w3 * (signal3_total || signal1_total);

    // ══════════════════════════════════════════════
    // IMPROVED VARIANCE / CONFIDENCE BAND
    // Signal disagreement widens the band; agreement narrows it
    // ══════════════════════════════════════════════
    const signalValues = [signal1_total];
    if (signal2_total !== null) signalValues.push(signal2_total);
    if (signal3_total !== null) signalValues.push(signal3_total);

    const signalSpread = signalValues.length > 1
      ? this.stdDev(signalValues) / this.average(signalValues)
      : 0;

    const baseVariance = this.calculateMonthlyVariance(data);
    const combinedVariance = Math.sqrt(
      Math.pow(baseVariance, 2) + Math.pow(signalSpread * 0.5, 2)
    );

    // Scale by proportion of month remaining (less remaining = less uncertainty)
    const variance = daysRemaining > 0
      ? Math.min(combinedVariance * Math.sqrt(daysRemaining / daysInMonth), 0.5)
      : 0;

    const remainingProjection = projected - mtdActual;
    const low = Math.max(0, mtdActual + remainingProjection * (1 - variance));
    const high = mtdActual + remainingProjection * (1 + variance);

    // ── Comparison metrics ──
    let vsLastYear = null;
    if (lastYearSameMonthTotal > 0) {
      vsLastYear = ((projected - lastYearSameMonthTotal) / lastYearSameMonthTotal) * 100;
    }

    let lastMonth = currentMonth - 1;
    let lastMonthYear = currentYear;
    if (lastMonth < 0) { lastMonth = 11; lastMonthYear = currentYear - 1; }
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
      daysRemaining,
      vsLastYear,
      lastYearAmount: Math.round(lastYearSameMonthTotal),
      vsMoM,
      lastMonthAmount: Math.round(lastMonthTotal),
      lastMonthName,
      confidence: this.getConfidenceLevel(daysRemaining),
      calcDetails: {
        dailyAvg: Math.round(recentDailyAvg),
        variancePct: Math.round(variance * 100),
        signals: {
          recentAvg: { value: Math.round(signal1_total), weight: Math.round(w1 * 100) },
          seasonalYoY: signal2_total !== null
            ? { value: Math.round(signal2_total), weight: Math.round(w2 * 100) }
            : null,
          momTrend: signal3_total !== null
            ? { value: Math.round(signal3_total), weight: Math.round(w3 * 100), r2: Math.round(momTrend.r2 * 100) }
            : null
        },
        signalAgreement: signalValues.length > 1
          ? (signalSpread < 0.05 ? 'high' : signalSpread < 0.15 ? 'medium' : 'low')
          : 'single-signal',
        monthProgress: Math.round(monthProgress * 100)
      }
    };
  },

  /**
   * Forecast next month's revenue
   * Uses a weighted blend of 4 signals, prioritizing seasonality and YoY
   * over recent daily averages (since there's no MTD data for next month):
   *   1. Same month last year x blended YoY growth (primary)
   *   2. MoM trajectory extrapolation
   *   3. Recent monthly average x seasonal index
   *   4. Recent daily average x days (fallback, lowest weight)
   *
   * @param {Array} data - Sorted daily revenue data
   * @returns {Object} Next month forecast
   */
  forecastNextMonth(data) {
    const now = new Date();
    let nextMonth = now.getMonth() + 1;
    let nextYear = now.getFullYear();
    if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }

    const monthName = new Date(nextYear, nextMonth, 1).toLocaleDateString('en-US', { month: 'long' });
    const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const availability = this.getDataAvailability(data);

    // ══════════════════════════════════════════════
    // SIGNAL 1: Same Month Last Year x Blended YoY Growth
    // Primary signal for next month (strongest differentiator)
    // ══════════════════════════════════════════════
    let signal1_total = null;
    const lastYearSameMonth = this.getMonthTotal(data, nextMonth, nextYear - 1);

    if (lastYearSameMonth > 0) {
      const blendedGrowth = this.calculateBlendedYoYGrowth(data);
      signal1_total = lastYearSameMonth * blendedGrowth.multiplier;
    }

    // ══════════════════════════════════════════════
    // SIGNAL 2: MoM Trajectory Extrapolation
    // Projects where the monthly revenue curve is heading
    // ══════════════════════════════════════════════
    let signal2_total = null;
    const momTrend = this.calculateMoMTrend(data, 6);
    if (momTrend && momTrend.r2 > 0.3) {
      signal2_total = momTrend.projectedNextMonth;
    }

    // ══════════════════════════════════════════════
    // SIGNAL 3: Recent Monthly Average x Seasonal Index
    // Adjusts baseline for seasonal expectations
    // ══════════════════════════════════════════════
    const recentMonthlyAvg = this.getRecentMonthlyAverage(data);
    const seasonalIndex = this.calculateSeasonalIndex(data, nextMonth);
    const signal3_total = recentMonthlyAvg > 0 ? recentMonthlyAvg * seasonalIndex : 0;

    // ══════════════════════════════════════════════
    // SIGNAL 4: Recent Daily Average (fallback, least differentiated)
    // ══════════════════════════════════════════════
    const recentDailyAvg = this.getRecentDailyAverage(data, 30);
    const signal4_total = recentDailyAvg * daysInNextMonth;

    // ══════════════════════════════════════════════
    // ADAPTIVE WEIGHT CALCULATION
    // Next month: prioritize YoY + seasonal over daily average
    // ══════════════════════════════════════════════
    let w1 = 0, w2 = 0, w3 = 0, w4 = 0;
    let basedOn = '';

    if (signal1_total !== null && signal2_total !== null) {
      // Best case: have YoY data AND MoM trend
      w1 = 0.40;
      w2 = 0.30;
      w3 = 0.20;
      w4 = 0.10;

      const seasonalConsistency = this.calculateSeasonalConsistency(data, nextMonth);
      if (seasonalConsistency > 0.7) {
        w1 += 0.10;
        w4 -= 0.05;
        w3 -= 0.05;
      }
      if (momTrend.r2 > 0.8) {
        w2 += 0.05;
        w4 -= 0.05;
      }

      basedOn = 'YoY growth + trajectory + seasonal';
    } else if (signal1_total !== null) {
      w1 = 0.50;
      w3 = 0.30;
      w4 = 0.20;
      basedOn = `${monthName} ${nextYear - 1} + growth`;
    } else if (signal2_total !== null) {
      w2 = 0.45;
      w3 = 0.25;
      w4 = 0.30;
      basedOn = 'Monthly trajectory + recent average';
    } else {
      w3 = availability.hasSeasonalData ? 0.40 : 0;
      w4 = availability.hasSeasonalData ? 0.60 : 1.0;
      basedOn = availability.hasSeasonalData
        ? 'Recent average + seasonal adjustment'
        : 'Recent daily average';
    }

    // Normalize
    const wTotal = w1 + w2 + w3 + w4;
    w1 /= wTotal; w2 /= wTotal; w3 /= wTotal; w4 /= wTotal;

    // ══════════════════════════════════════════════
    // FINAL BLENDED PROJECTION
    // ══════════════════════════════════════════════
    const projected = w1 * (signal1_total || 0)
                    + w2 * (signal2_total || 0)
                    + w3 * signal3_total
                    + w4 * signal4_total;

    // ══════════════════════════════════════════════
    // IMPROVED VARIANCE
    // ══════════════════════════════════════════════
    const activeSignals = [signal3_total, signal4_total];
    if (signal1_total !== null) activeSignals.push(signal1_total);
    if (signal2_total !== null) activeSignals.push(signal2_total);

    const signalSpread = activeSignals.length > 1
      ? this.stdDev(activeSignals) / this.average(activeSignals)
      : 0;

    const baseVariance = this.calculateMonthlyVariance(data);
    const nextMonthPremium = 1.3; // 30% wider than current month baseline
    const combinedVariance = Math.sqrt(
      Math.pow(baseVariance * nextMonthPremium, 2) + Math.pow(signalSpread * 0.5, 2)
    );
    const variance = Math.min(combinedVariance, 0.5);

    const low = Math.max(0, projected * (1 - variance));
    const high = projected * (1 + variance);

    return {
      name: monthName,
      year: nextYear,
      projected: Math.round(projected),
      low: Math.round(low),
      high: Math.round(high),
      basedOn,
      confidence: 'lower',
      calcDetails: {
        dailyAvg: Math.round(recentDailyAvg),
        daysInMonth: daysInNextMonth,
        variancePct: Math.round(variance * 100),
        seasonalIndex: Math.round(seasonalIndex * 100) / 100,
        signals: {
          seasonalYoY: signal1_total !== null
            ? { value: Math.round(signal1_total), weight: Math.round(w1 * 100) }
            : null,
          momTrend: signal2_total !== null
            ? { value: Math.round(signal2_total), weight: Math.round(w2 * 100), r2: Math.round(momTrend.r2 * 100) }
            : null,
          seasonalAvg: { value: Math.round(signal3_total), weight: Math.round(w3 * 100) },
          recentDaily: { value: Math.round(signal4_total), weight: Math.round(w4 * 100) }
        },
        signalAgreement: activeSignals.length > 1
          ? (signalSpread < 0.05 ? 'high' : signalSpread < 0.15 ? 'medium' : 'low')
          : 'single-signal'
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

    // Apply variance only to the uncertain remaining portion of the year
    // Scale variance up as fewer months remain (less averaging of monthly fluctuations)
    const startOfYear = new Date(currentYear, 0, 1);
    const daysPassed = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    const daysInYear = ((currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0) ? 366 : 365;
    const daysLeft = daysInYear - daysPassed;
    const baseVariance = this.calculateMonthlyVariance(data);
    const variance = daysLeft > 0
      ? Math.min(baseVariance * Math.sqrt(daysInYear / daysLeft), 1.5)
      : 0;
    const remainingProjection = Math.max(0, projected - ytdCurrent);
    const low = ytdCurrent + remainingProjection * (1 - variance);
    const high = ytdCurrent + remainingProjection * (1 + variance);

    // Build calcDetails for the info tooltip
    const method = lastYearTotal > 0 ? 'yoy' : 'extrapolation';
    const calcDetails = { variancePct: Math.round(variance * 100), signals: {} };
    if (method === 'yoy') {
      calcDetails.signals.lastYearTotal = { value: Math.round(lastYearTotal), weight: 100, label: 'Last year total' };
      calcDetails.method = `Last year \u00D7 (1 + ${Math.round(yoyGrowthRate * 100)}% YTD YoY growth)`;
    } else {
      calcDetails.signals.ytdExtrapolation = { value: Math.round(projected), weight: 100, label: 'YTD daily avg \u00D7 365' };
      calcDetails.method = 'YTD daily average extrapolated to full year';
    }
    calcDetails.signalAgreement = 'single-signal';

    return {
      projected: Math.round(projected),
      low: Math.round(low),
      high: Math.round(high),
      lastYearTotal: Math.round(lastYearTotal),
      currentYear,
      yoyGrowthRate: Math.round(yoyGrowthRate * 100),
      calcDetails
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

  // ── Forecasting Signal Helpers ──

  /**
   * Calculate the seasonal index for a given month.
   * Returns a multiplier relative to the annual average month.
   * e.g., 1.3 means this month typically does 30% above average.
   * Uses complete prior calendar years only.
   *
   * @param {Array} data - Sorted daily revenue data
   * @param {number} targetMonth - Month index (0-11)
   * @returns {number} Seasonal index (1.0 = average)
   */
  calculateSeasonalIndex(data, targetMonth) {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Build yearly data: { year: { months: {0: total, ...}, yearTotal } }
    const yearlyData = {};
    data.forEach(d => {
      const date = new Date(d.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      if (!yearlyData[year]) yearlyData[year] = { months: {}, yearTotal: 0 };
      if (!yearlyData[year].months[month]) yearlyData[year].months[month] = 0;
      yearlyData[year].months[month] += (d.revenue || 0);
      yearlyData[year].yearTotal += (d.revenue || 0);
    });

    // Only use years with target month data, 10+ months of data, and not current year
    const usableYears = Object.keys(yearlyData).filter(year => {
      const y = parseInt(year);
      const monthCount = Object.keys(yearlyData[y].months).length;
      return yearlyData[y].months[targetMonth] !== undefined &&
             monthCount >= 10 && y !== currentYear;
    });

    if (usableYears.length === 0) return 1.0;

    const indices = usableYears.map(year => {
      const y = parseInt(year);
      const monthRevenue = yearlyData[y].months[targetMonth];
      const avgMonth = yearlyData[y].yearTotal / 12;
      return avgMonth > 0 ? monthRevenue / avgMonth : 1.0;
    });

    return this.average(indices);
  },

  /**
   * Calculate YoY growth rate using only the most recent N months
   * compared to the same N months one year prior.
   * More responsive than the full 12-month version.
   *
   * @param {Array} data - Sorted daily revenue data
   * @param {number} monthsBack - Number of recent months to use (3 or 6)
   * @returns {number|null} Growth multiplier, or null if insufficient data
   */
  calculateRecentYoYGrowthRate(data, monthsBack) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let recentTotal = 0;
    let priorTotal = 0;
    let recentMonthsWithData = 0;
    let priorMonthsWithData = 0;

    for (let i = 1; i <= monthsBack; i++) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const recentMonth = targetDate.getMonth();
      const recentYear = targetDate.getFullYear();

      const recentMonthTotal = this.getMonthTotal(data, recentMonth, recentYear);
      const priorMonthTotal = this.getMonthTotal(data, recentMonth, recentYear - 1);

      if (recentMonthTotal > 0) {
        recentTotal += recentMonthTotal;
        recentMonthsWithData++;
      }
      if (priorMonthTotal > 0) {
        priorTotal += priorMonthTotal;
        priorMonthsWithData++;
      }
    }

    const minMonths = Math.ceil(monthsBack / 2);
    if (recentMonthsWithData < minMonths || priorMonthsWithData < minMonths) {
      return null;
    }

    // Normalize to per-month average to handle partial data
    const recentAvg = recentTotal / recentMonthsWithData;
    const priorAvg = priorTotal / priorMonthsWithData;

    return priorAvg > 0 ? recentAvg / priorAvg : null;
  },

  /**
   * Calculate a blended YoY growth multiplier.
   * Weights the 3-month rate (responsive) and 6-month rate (stable).
   * Falls back to the full 12-month rate if both are unavailable.
   *
   * @param {Array} data - Sorted daily revenue data
   * @returns {{multiplier: number, confidence: string}}
   */
  calculateBlendedYoYGrowth(data) {
    const rate3mo = this.calculateRecentYoYGrowthRate(data, 3);
    const rate6mo = this.calculateRecentYoYGrowthRate(data, 6);
    const rate12mo = this.calculateYoYGrowth(data); // existing method

    if (rate3mo !== null && rate6mo !== null) {
      return {
        multiplier: rate3mo * 0.6 + rate6mo * 0.4,
        confidence: 'high'
      };
    }
    if (rate6mo !== null) return { multiplier: rate6mo, confidence: 'medium' };
    if (rate3mo !== null) return { multiplier: rate3mo, confidence: 'medium' };
    return { multiplier: rate12mo, confidence: 'low' };
  },

  /**
   * Calculate month-over-month growth trajectory using linear regression.
   * Projects current and next month totals based on the trend.
   *
   * @param {Array} data - Sorted daily revenue data
   * @param {number} monthsBack - Number of months to look back (default 6)
   * @returns {{projectedCurrentMonth: number, projectedNextMonth: number, slope: number, r2: number}|null}
   */
  calculateMoMTrend(data, monthsBack = 6) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthlyTotals = [];
    for (let i = monthsBack; i >= 1; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const total = this.getMonthTotal(data, targetDate.getMonth(), targetDate.getFullYear());
      if (total > 0) monthlyTotals.push(total);
    }

    if (monthlyTotals.length < 3) return null;

    // Simple linear regression: y = intercept + slope * x
    const n = monthlyTotals.length;
    const xs = monthlyTotals.map((_, i) => i);
    const ys = monthlyTotals;

    const sumX = xs.reduce((s, x) => s + x, 0);
    const sumY = ys.reduce((s, y) => s + y, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const sumX2 = xs.reduce((s, x) => s + x * x, 0);

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const yMean = sumY / n;
    const ssRes = ys.reduce((s, y, i) => s + Math.pow(y - (intercept + slope * i), 2), 0);
    const ssTot = ys.reduce((s, y) => s + Math.pow(y - yMean, 2), 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return {
      projectedCurrentMonth: Math.max(0, intercept + slope * n),
      projectedNextMonth: Math.max(0, intercept + slope * (n + 1)),
      slope,
      r2,
      monthCount: n
    };
  },

  /**
   * Assess what historical data is available for forecasting.
   * Drives adaptive weight selection.
   *
   * @param {Array} data - Sorted daily revenue data
   * @returns {Object} Availability flags and metrics
   */
  getDataAvailability(data) {
    if (!data || data.length === 0) {
      return { totalDays: 0, hasLastYear: false, hasSeasonalData: false, monthsOfData: 0 };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const firstDate = new Date(data[0].date);
    const lastDate = new Date(data[data.length - 1].date);
    const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    const monthsOfData = Math.floor(totalDays / 30);

    const hasLastYear = this.getMonthTotal(data, currentMonth, currentYear - 1) > 0;
    const hasSeasonalData = totalDays >= 365;

    let nextMonth = currentMonth + 1;
    let nextMonthYear = currentYear;
    if (nextMonth > 11) { nextMonth = 0; nextMonthYear++; }
    const hasNextMonthLastYear = this.getMonthTotal(data, nextMonth, nextMonthYear - 1) > 0;

    return { totalDays, monthsOfData, hasLastYear, hasNextMonthLastYear, hasSeasonalData };
  },

  /**
   * Measure how consistent the seasonal pattern is for a given month.
   * Returns a value from 0 (inconsistent) to 1 (highly consistent).
   *
   * @param {Array} data - Sorted daily revenue data
   * @param {number} targetMonth - Month index (0-11)
   * @returns {number} Consistency score (0-1)
   */
  calculateSeasonalConsistency(data, targetMonth) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearlyData = {};

    data.forEach(d => {
      const date = new Date(d.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      if (!yearlyData[year]) yearlyData[year] = { months: {}, yearTotal: 0 };
      if (!yearlyData[year].months[month]) yearlyData[year].months[month] = 0;
      yearlyData[year].months[month] += (d.revenue || 0);
      yearlyData[year].yearTotal += (d.revenue || 0);
    });

    const indices = [];
    Object.keys(yearlyData).forEach(year => {
      const y = parseInt(year);
      if (y === currentYear) return;
      const monthCount = Object.keys(yearlyData[y].months).length;
      if (monthCount < 10 || !yearlyData[y].months[targetMonth]) return;
      const avgMonth = yearlyData[y].yearTotal / 12;
      if (avgMonth > 0) indices.push(yearlyData[y].months[targetMonth] / avgMonth);
    });

    if (indices.length < 2) return 0;

    const avg = this.average(indices);
    const sd = this.stdDev(indices);
    const cv = avg > 0 ? sd / avg : 1;

    // CV of 0 = perfect consistency (score 1.0), CV >= 0.5 = score ~0
    return Math.max(0, Math.min(1, 1 - cv * 2));
  },

  // ── End Forecasting Signal Helpers ──

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

    // Use last 3 months for variance calculation (more responsive to recent changes)
    for (let i = 1; i <= 3; i++) {
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
