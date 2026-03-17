# Lucky Cat

Revenue forecasting and Apple Search Ads ROI tracking for RevenueCat.

## Features

### Revenue Forecasting
When viewing RevenueCat's Charts (Revenue view), Lucky Cat adds a forecasting panel showing:
- Current month forecast with confidence range
- Next month forecast based on historical patterns
- Year-over-year comparison
- Daily pattern insights

### Apple Search Ads ROI Integration (Optional)
When viewing Attribution > Keywords, Lucky Cat can add Spend and ROI columns by pulling data from Apple Search Ads API.

## Installation

### From Source (Development)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `lucky-cat` folder

### From Chrome Web Store
*(Coming soon)*

## Usage

1. **Forecasting**: Navigate to RevenueCat → Charts → Revenue view. The forecast panel will appear automatically above the chart.

2. **ASA Integration** (Optional):
   - Click the Lucky Cat icon → Settings (gear icon)
   - Enable "Apple Search Ads Integration"
   - Enter your ASA credentials (get from Apple Search Ads → Account Settings → API)
   - Navigate to RevenueCat → Attribution → Keywords to see Spend and ROI columns

## Configuration

Click the extension icon and then the gear icon to access settings:

- **Forecasting**: Enable/disable the forecast panel
- **Confidence Range**: Auto (calculated from last 3 months), or manual override (±10% to ±50%)
- **ASA Integration**: Configure Apple Search Ads credentials
- **Cache Duration**: How long to cache data (1 hour to 7 days)

## How Forecasting Works

### Current Month Projection
- Uses month-to-date actual revenue
- Adds forecasted revenue for remaining days based on recent 15-day daily average
- Confidence range applies variance only to the uncertain remaining days (not the known actual), so the range naturally narrows as the month progresses
- Variance is calculated from the last 3 months of actual store data (stdDev / average), making it specific to each store's volatility
- As days remaining decrease, per-day variance scales up (sqrt scaling) to account for daily spikes like compressed subscription renewals at end of shorter months

### Next Month Projection
- Uses the higher of: recent 15-day daily average extrapolated, or same month last year adjusted for YoY growth
- Full variance applied since the entire month is uncertain

### Full Year Projection
- Projects full year as last year's total adjusted by YTD year-over-year growth rate
- Variance applies only to the remaining projected portion, using the store's actual calculated variance
- Range narrows as more of the year's actual data is known

### Year-over-Year Comparison
- Compares YTD revenue vs same period last year
- Accounts for same number of days for fair comparison

## Privacy

- All data stays on your device
- No data sent to external servers (except Apple's API if ASA is configured)
- No analytics or tracking
- See [PRIVACY.md](PRIVACY.md) for full details

## Development

### Project Structure

```
lucky-cat/
├── manifest.json           # Extension manifest
├── background.js           # Service worker for API calls
├── content/                # Content scripts
│   ├── content.js          # Main entry point
│   ├── forecasting.js      # Forecasting calculations
│   ├── dom-parser.js       # RevenueCat page parsing
│   ├── ui-injector.js      # UI component injection
│   └── asa-integration.js  # ASA column injection
├── popup/                  # Extension popup
├── options/                # Settings page
├── styles/                 # Injected CSS
├── utils/                  # Utilities
└── icons/                  # Extension icons
```

### Building Icons

See `icons/README.md` for instructions on generating PNG icons from the SVG source.

## License

MIT - See [LICENSE](LICENSE)

## Links

- [Privacy Policy](PRIVACY.md)
- [GitHub Repository](https://github.com/daverad/lucky-cat)
- Support: meow@luckycat.tools

## Acknowledgments

- Inspired by RevenueCat's excellent dashboard
- Lucky Cat (Maneki-neko) for bringing good fortune
