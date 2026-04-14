export type GlossaryCategory =
  | "Chart Patterns"
  | "Indicators"
  | "Order Types"
  | "General Crypto";

export interface GlossaryTerm {
  term: string;
  slug: string;
  category: GlossaryCategory;
  definition: string;
}

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  "Chart Patterns",
  "Indicators",
  "Order Types",
  "General Crypto",
];

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // ========== Chart Patterns ==========
  {
    term: "Support",
    slug: "support",
    category: "Chart Patterns",
    definition:
      "A price level where a coin has historically stopped falling and bounced back up. Traders expect buyers to step in here, which often makes the price reverse or pause before continuing down.",
  },
  {
    term: "Resistance",
    slug: "resistance",
    category: "Chart Patterns",
    definition:
      "A price level where a coin has historically struggled to break above. Sellers tend to dominate at this level, so the price often pulls back until enough demand builds to push through.",
  },
  {
    term: "Breakout",
    slug: "breakout",
    category: "Chart Patterns",
    definition:
      "When the price moves decisively past a support or resistance level. Traders see breakouts as a signal that a new trend is starting, often with increased volume confirming the move.",
  },
  {
    term: "Fakeout",
    slug: "fakeout",
    category: "Chart Patterns",
    definition:
      "A move that looks like a breakout but quickly reverses back inside the previous range. Fakeouts trap traders who entered early and are a common source of losses.",
  },
  {
    term: "Head and Shoulders",
    slug: "head-and-shoulders",
    category: "Chart Patterns",
    definition:
      "A bearish reversal pattern with three peaks — a higher middle peak (the head) flanked by two lower peaks (the shoulders). It suggests an uptrend is losing strength and may reverse downward.",
  },
  {
    term: "Double Top",
    slug: "double-top",
    category: "Chart Patterns",
    definition:
      "A bearish pattern where the price hits the same resistance level twice and fails to break through. It suggests buyers are exhausted and a downward move is likely.",
  },
  {
    term: "Double Bottom",
    slug: "double-bottom",
    category: "Chart Patterns",
    definition:
      "A bullish pattern where the price tests the same support level twice and bounces both times. It suggests sellers are exhausted and an upward move is likely.",
  },
  {
    term: "Cup and Handle",
    slug: "cup-and-handle",
    category: "Chart Patterns",
    definition:
      "A bullish continuation pattern that looks like a teacup — a rounded bottom followed by a small downward drift (the handle) before a breakout. It typically signals more upside ahead.",
  },
  {
    term: "Ascending Triangle",
    slug: "ascending-triangle",
    category: "Chart Patterns",
    definition:
      "A bullish pattern formed by a flat top resistance and rising lower lows. It usually breaks upward when buyers finally overwhelm the resistance.",
  },
  {
    term: "Descending Triangle",
    slug: "descending-triangle",
    category: "Chart Patterns",
    definition:
      "A bearish pattern formed by a flat bottom support and falling lower highs. It usually breaks downward when sellers finally push through the support.",
  },
  {
    term: "Symmetrical Triangle",
    slug: "symmetrical-triangle",
    category: "Chart Patterns",
    definition:
      "A consolidation pattern where highs get lower and lows get higher, compressing into a point. The breakout direction is neutral until it happens — volume usually confirms which way it goes.",
  },
  {
    term: "Rising Wedge",
    slug: "rising-wedge",
    category: "Chart Patterns",
    definition:
      "A bearish pattern where both highs and lows trend upward but converge, signaling weakening momentum. It typically breaks downward.",
  },
  {
    term: "Falling Wedge",
    slug: "falling-wedge",
    category: "Chart Patterns",
    definition:
      "A bullish pattern where both highs and lows trend downward but converge. Selling pressure is exhausting and a breakout to the upside is expected.",
  },
  {
    term: "Flag",
    slug: "flag",
    category: "Chart Patterns",
    definition:
      "A short consolidation after a strong directional move, resembling a flag on a pole. It usually continues in the same direction as the initial move.",
  },
  {
    term: "Pennant",
    slug: "pennant",
    category: "Chart Patterns",
    definition:
      "A small symmetrical triangle that forms after a sharp move. Like a flag, it signals a brief pause before the trend continues in the same direction.",
  },
  {
    term: "Channel",
    slug: "channel",
    category: "Chart Patterns",
    definition:
      "A price moving between two parallel trendlines — one support, one resistance. Channels can slope up, down, or sideways and give traders clear levels to buy and sell.",
  },

  // ========== Indicators ==========
  {
    term: "RSI",
    slug: "rsi",
    category: "Indicators",
    definition:
      "Relative Strength Index — a momentum indicator that measures how overbought or oversold an asset is on a scale of 0 to 100. Readings above 70 suggest overbought (possible pullback); below 30 suggest oversold (possible bounce).",
  },
  {
    term: "MACD",
    slug: "macd",
    category: "Indicators",
    definition:
      "Moving Average Convergence Divergence — a trend-following indicator that compares two moving averages. When the MACD line crosses above its signal line it's bullish; crossing below is bearish.",
  },
  {
    term: "Moving Average",
    slug: "moving-average",
    category: "Indicators",
    definition:
      "The average price of an asset over a set number of periods, redrawn every period. Smooths out noise and shows the overall trend direction.",
  },
  {
    term: "SMA",
    slug: "sma",
    category: "Indicators",
    definition:
      "Simple Moving Average — the arithmetic mean of closing prices over a given number of periods. Commonly used with 50, 100, and 200-period settings as trend references.",
  },
  {
    term: "EMA",
    slug: "ema",
    category: "Indicators",
    definition:
      "Exponential Moving Average — like a SMA but gives more weight to recent prices. Reacts faster to price changes, which is why short-term traders prefer it.",
  },
  {
    term: "Bollinger Bands",
    slug: "bollinger-bands",
    category: "Indicators",
    definition:
      "Three lines plotted around price: a middle moving average and upper/lower bands based on standard deviation. When bands are tight, volatility is low; when price touches the outer bands, a reversal or breakout is often near.",
  },
  {
    term: "Volume",
    slug: "volume",
    category: "Indicators",
    definition:
      "The total amount of an asset traded in a period. Rising volume confirms the strength of a move; low volume makes moves less trustworthy.",
  },
  {
    term: "VWAP",
    slug: "vwap",
    category: "Indicators",
    definition:
      "Volume-Weighted Average Price — the average price an asset has traded at through the day, weighted by volume. Traders use it as a fair-value benchmark and as dynamic support or resistance.",
  },
  {
    term: "Fibonacci Retracement",
    slug: "fibonacci-retracement",
    category: "Indicators",
    definition:
      "Horizontal lines drawn at key ratios (23.6%, 38.2%, 50%, 61.8%, 78.6%) between a swing high and low. Traders use these as likely reversal levels during pullbacks.",
  },
  {
    term: "Stochastic Oscillator",
    slug: "stochastic",
    category: "Indicators",
    definition:
      "A momentum indicator comparing a closing price to its range over time, plotted 0-100. Readings above 80 suggest overbought; below 20 suggest oversold.",
  },
  {
    term: "Divergence",
    slug: "divergence",
    category: "Indicators",
    definition:
      "When price moves one way but an indicator (like RSI or MACD) moves the other. Divergences often warn that the current trend is losing strength and may reverse.",
  },
  {
    term: "Golden Cross",
    slug: "golden-cross",
    category: "Indicators",
    definition:
      "When a short-term moving average (usually the 50-day) crosses above a long-term one (usually the 200-day). It's a widely-watched bullish signal for the longer-term trend.",
  },
  {
    term: "Death Cross",
    slug: "death-cross",
    category: "Indicators",
    definition:
      "When a short-term moving average crosses below a long-term one (typically 50-day below 200-day). It's a bearish signal warning of extended downside.",
  },
  {
    term: "ATR",
    slug: "atr",
    category: "Indicators",
    definition:
      "Average True Range — measures how much an asset typically moves over a given period. Traders use it to set stop losses that account for normal volatility.",
  },
  {
    term: "Ichimoku Cloud",
    slug: "ichimoku",
    category: "Indicators",
    definition:
      "A Japanese indicator that shows support, resistance, trend direction, and momentum all at once using several lines and a shaded 'cloud'. Price above the cloud is bullish; below is bearish.",
  },

  // ========== Order Types ==========
  {
    term: "Market Order",
    slug: "market-order",
    category: "Order Types",
    definition:
      "An order that executes immediately at the best available price. Fast, but you can get worse fills than expected (slippage) in fast-moving or thin markets.",
  },
  {
    term: "Limit Order",
    slug: "limit-order",
    category: "Order Types",
    definition:
      "An order to buy or sell only at a specific price or better. It won't execute until the market reaches your price, so it's slower but gives you price control.",
  },
  {
    term: "Stop Loss",
    slug: "stop-loss",
    category: "Order Types",
    definition:
      "An order that automatically sells your position if the price drops to a set level. Used to limit losses on a losing trade. Often written as 'SL'.",
  },
  {
    term: "Take Profit",
    slug: "take-profit",
    category: "Order Types",
    definition:
      "An order that automatically closes your position once it hits a target profit level. Often written as 'TP'. Removes the need to watch the chart and locks in gains.",
  },
  {
    term: "Stop-Limit Order",
    slug: "stop-limit",
    category: "Order Types",
    definition:
      "A stop loss that triggers a limit order instead of a market order. Gives price control at the risk of not filling at all if the market gaps through your level.",
  },
  {
    term: "Trailing Stop",
    slug: "trailing-stop",
    category: "Order Types",
    definition:
      "A stop loss that moves with the price as it goes in your favor. Lets profits run while automatically tightening protection as the trade works.",
  },
  {
    term: "OCO Order",
    slug: "oco",
    category: "Order Types",
    definition:
      "One-Cancels-the-Other — two linked orders where executing one cancels the other. Commonly used to set both a take profit and stop loss at the same time.",
  },
  {
    term: "Leverage",
    slug: "leverage",
    category: "Order Types",
    definition:
      "Borrowing from an exchange to open a larger position than your own capital allows. Amplifies both gains and losses — 10x leverage means a 10% move wipes out your collateral.",
  },
  {
    term: "Long",
    slug: "long",
    category: "Order Types",
    definition:
      "A bet that the price will go up. You profit if the asset's price rises from where you entered and lose if it falls.",
  },
  {
    term: "Short",
    slug: "short",
    category: "Order Types",
    definition:
      "A bet that the price will go down. You borrow the asset to sell it, planning to buy it back cheaper — you profit if the price falls and lose if it rises.",
  },
  {
    term: "Margin",
    slug: "margin",
    category: "Order Types",
    definition:
      "The collateral you put up to open a leveraged position. If the trade goes against you and your margin gets too low, the position can be liquidated.",
  },
  {
    term: "Liquidation",
    slug: "liquidation",
    category: "Order Types",
    definition:
      "When your leveraged position is forcibly closed because losses consumed your margin. You lose your collateral — often written as 'getting liq'd'.",
  },

  // ========== General Crypto ==========
  {
    term: "HODL",
    slug: "hodl",
    category: "General Crypto",
    definition:
      "Holding a coin long-term through ups and downs instead of trading it. Originally a typo of 'hold' in a 2013 Bitcoin forum post, now used to describe a buy-and-hold strategy.",
  },
  {
    term: "FOMO",
    slug: "fomo",
    category: "General Crypto",
    definition:
      "Fear Of Missing Out — the urge to buy into a rally because the price is surging. FOMO buys often happen near local tops and lead to losses.",
  },
  {
    term: "FUD",
    slug: "fud",
    category: "General Crypto",
    definition:
      "Fear, Uncertainty, and Doubt — negative news, rumors, or commentary that scares people into selling. Sometimes real, sometimes spread intentionally to drive prices down.",
  },
  {
    term: "DYOR",
    slug: "dyor",
    category: "General Crypto",
    definition:
      "Do Your Own Research — a disclaimer posted with crypto calls meaning the author isn't giving financial advice. You should verify claims and understand risks yourself.",
  },
  {
    term: "NFA",
    slug: "nfa",
    category: "General Crypto",
    definition:
      "Not Financial Advice — a legal-sounding disclaimer crypto traders use to say their posts shouldn't be treated as professional investment guidance.",
  },
  {
    term: "Whale",
    slug: "whale",
    category: "General Crypto",
    definition:
      "A person or entity holding a very large amount of a coin. Whale trades can move prices significantly, so traders watch on-chain data to track what they're doing.",
  },
  {
    term: "Pump and Dump",
    slug: "pump-and-dump",
    category: "General Crypto",
    definition:
      "A scheme where insiders hype a coin to pump its price, then sell (dump) into the buying frenzy. Late buyers are left with heavy losses when the coin collapses.",
  },
  {
    term: "Rug Pull",
    slug: "rug-pull",
    category: "General Crypto",
    definition:
      "When developers of a crypto project suddenly abandon it and run off with investors' money, often by draining the liquidity pool. Common in shady DeFi and memecoin launches.",
  },
  {
    term: "Altcoin",
    slug: "altcoin",
    category: "General Crypto",
    definition:
      "Any cryptocurrency other than Bitcoin. Tends to be more volatile than BTC and often moves in bigger swings both up and down.",
  },
  {
    term: "Stablecoin",
    slug: "stablecoin",
    category: "General Crypto",
    definition:
      "A cryptocurrency pegged to a stable asset like the US dollar (e.g. USDT, USDC). Used to park value without converting back to fiat, and as a trading pair on exchanges.",
  },
  {
    term: "DeFi",
    slug: "defi",
    category: "General Crypto",
    definition:
      "Decentralized Finance — financial services (lending, trading, yield) built on smart contracts instead of banks. Users interact directly with protocols via their wallets.",
  },
  {
    term: "CeFi",
    slug: "cefi",
    category: "General Crypto",
    definition:
      "Centralized Finance — traditional crypto exchanges and services where a company holds your funds and executes trades on your behalf. Easier to use but you don't control your keys.",
  },
  {
    term: "DEX",
    slug: "dex",
    category: "General Crypto",
    definition:
      "Decentralized Exchange — a platform like Uniswap where users trade directly with each other via smart contracts. No signup, you control your funds the whole time.",
  },
  {
    term: "CEX",
    slug: "cex",
    category: "General Crypto",
    definition:
      "Centralized Exchange — platforms like Binance or Coinbase that hold user funds and match orders on their own books. More liquidity, but you trust them with your money.",
  },
  {
    term: "Gas Fees",
    slug: "gas-fees",
    category: "General Crypto",
    definition:
      "The fees paid to execute transactions on a blockchain like Ethereum. Fees rise when the network is busy and fall when it's quiet.",
  },
  {
    term: "Slippage",
    slug: "slippage",
    category: "General Crypto",
    definition:
      "The difference between the price you expected and the price you actually got filled at. Worse on thin markets, big orders, or fast-moving prices.",
  },
  {
    term: "Bull Market",
    slug: "bull-market",
    category: "General Crypto",
    definition:
      "A sustained period of rising prices and optimistic sentiment. In crypto, bull markets can be extreme — Bitcoin often gains several multiples while altcoins go further.",
  },
  {
    term: "Bear Market",
    slug: "bear-market",
    category: "General Crypto",
    definition:
      "A sustained period of falling prices and pessimistic sentiment. Crypto bear markets are brutal — coins commonly drop 80%+ from their peaks.",
  },
  {
    term: "Market Cap",
    slug: "market-cap",
    category: "General Crypto",
    definition:
      "The total value of a coin's circulating supply (price × number of coins). Gives a sense of a coin's size relative to others.",
  },
  {
    term: "TVL",
    slug: "tvl",
    category: "General Crypto",
    definition:
      "Total Value Locked — the dollar value of assets deposited into a DeFi protocol. A higher TVL usually means more trust and usage.",
  },
  {
    term: "APY",
    slug: "apy",
    category: "General Crypto",
    definition:
      "Annual Percentage Yield — the yearly return on a deposit including compounding. Stated APYs in DeFi can be volatile and often drop as more capital enters.",
  },
  {
    term: "Smart Contract",
    slug: "smart-contract",
    category: "General Crypto",
    definition:
      "Self-executing code deployed on a blockchain that runs automatically when its conditions are met. The foundation of DeFi, NFTs, and most crypto apps.",
  },
  {
    term: "Airdrop",
    slug: "airdrop",
    category: "General Crypto",
    definition:
      "When a project sends free tokens to wallet addresses that meet certain criteria — often past users or early supporters. A common way to launch new tokens.",
  },
  {
    term: "Shitcoin",
    slug: "shitcoin",
    category: "General Crypto",
    definition:
      "A slang term for a low-quality or scammy cryptocurrency with no real utility. Usually launched to pump and dump rather than build anything lasting.",
  },
  {
    term: "Memecoin",
    slug: "memecoin",
    category: "General Crypto",
    definition:
      "A cryptocurrency based on a meme, joke, or internet culture rather than a product (e.g. DOGE, SHIB). Price is driven by community hype, not fundamentals.",
  },
  {
    term: "Diamond Hands",
    slug: "diamond-hands",
    category: "General Crypto",
    definition:
      "Someone who holds their position through heavy volatility without selling. The opposite of paper hands — treated as a badge of honor in crypto culture.",
  },
  {
    term: "Paper Hands",
    slug: "paper-hands",
    category: "General Crypto",
    definition:
      "Someone who sells at the first sign of trouble. Usually used as an insult toward traders who dump during a dip and miss the eventual recovery.",
  },
  {
    term: "Degen",
    slug: "degen",
    category: "General Crypto",
    definition:
      "Short for degenerate — a trader who takes extreme risks, often on memecoins or high leverage. Used as both an insult and a self-description in crypto Twitter.",
  },
  {
    term: "Ape",
    slug: "ape",
    category: "General Crypto",
    definition:
      "To buy a coin without doing much research, usually because of hype or momentum. 'Aping in' is the act of taking a position on vibes rather than analysis.",
  },
  {
    term: "Moonshot",
    slug: "moonshot",
    category: "General Crypto",
    definition:
      "A small coin that someone thinks could 10x, 100x, or more. High risk, high reward — most moonshot bets fail, but occasional wins are huge.",
  },
  {
    term: "ATH",
    slug: "ath",
    category: "General Crypto",
    definition:
      "All-Time High — the highest price an asset has ever reached. Breaking ATH is bullish since there are no previous holders in loss left to sell.",
  },
];
