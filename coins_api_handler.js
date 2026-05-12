export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  // Set longer timeout for Vercel
  res.socket.setTimeout(180000);
  
  try {
    let allPairs = [];

    // 300 CRYPTO KEYWORDS - 150 Original + 150 New
    const keywords = [
      // 50 MOST COMMON
      "inu", "doge", "shiba", "floki", "bonk", "pepe", "cat", "paws", "woof", "mew",
      "moon", "mars", "safe", "rocket", "astro", "star", "galaxy", "orbit", "comet", "nova",
      "pump", "swap", "yield", "earn", "stake", "burn", "bull", "whale", "lambo", "hodl",
      "coin", "token", "chain", "protocol", "labs", "finance", "dao", "dex", "pay", "net",
      "gold", "pro", "plus", "ultra", "max", "super", "prime", "giga", "alpha", "king",
      
      // 50 LESS COMMON
      "wif", "frog", "bird", "ape", "kong", "sloth", "panda", "hamster", "fox", "wolf",
      "chad", "wojak", "based", "degens", "fren", "vibes", "retro", "pixel", "arcade", "degen",
      "bridge", "wrapped", "layer", "node", "liquidity", "vault", "oracle", "mint", "ledger", "matrix",
      "rich", "wealth", "fortune", "gem", "diamond", "pearl", "emerald", "zen", "bliss", "aura",
      "rain", "snow", "fire", "storm", "leaf", "seed", "bloom", "root", "peak", "valley",
      
      // 50 RARE / EXPERIMENTAL
      "garlic", "pickle", "banano", "cthulhu", "harem", "waifu", "sneed", "feed", "sperm", "waif",
      "ghost", "shadow", "phantom", "void", "echo", "pulse", "spark", "glitch", "static", "flux",
      "satoshi", "gwei", "wei", "halving", "forked", "genesis", "legacy", "ancient", "relic", "myth",
      "spicy", "salty", "crunchy", "fluffy", "gigantic", "tiny", "invisible", "liquid", "solid", "frozen",
      "inator", "omics", "topia", "verse", "sphere", "land", "world", "city", "hub", "port",
      
      // 150 NEW - GAMING & METAVERSE (30)
      "raid", "boss", "dungeon", "quest", "adventure", "hero", "legend", "epic", "mythic", "legendary",
      "rogue", "warrior", "mage", "wizard", "knight", "paladin", "archer", "ranger", "druid", "shaman",
      "guild", "party", "squad", "team", "clan", "faction", "alliance", "empire", "kingdom", "realm",
      
      // TIKTOK & VIRAL TRENDS (30)
      "viral", "trending", "hype", "slay", "vibe", "lit", "fire", "heat",
      "boom", "bang", "pop", "zap", "buzz", "craze", "obsessed", "iconic",
      "flex", "simp", "bet", "cap", "no cap", "ate", "slayed", "era",
      "sus", "based", "redpilled", "sigma", "bussin", "hits different",
      
      // RANDOM & CHAOTIC (30)
      "random", "chaos", "crazy", "wild", "mad", "insane", "psycho", "maniac", "beast", "savage",
      "gremlin", "anarchy", "pandemonium", "bedlam", "madness", "frenzy", "rampage",
      "tornado", "hurricane", "earthquake", "explosion", "supernova", "blackhole", "singularity",
      "glitch", "bug", "error", "system", "corrupt", "virus", "malware", "hacked",
      
      // TRENDY WORDS (30)
      "cringe", "incel", "coomer", "boomer", "zoomer", "millennial", "gen", "karen",
      "clout", "swag", "drip", "sauce", "steez", "style", "fresh", "lowkey", "highkey",
      "fr fr", "tbh", "ngl", "imo", "main character", "vibe check", "moment",
      "alpha", "beta", "omega", "legend", "king", "queen", "boss",
      
      // INTERNET CULTURE (30)
      "normie", "leet", "pwn", "noob", "pro", "gamer", "streamer", "influencer", "creator",
      "content", "algorithm", "hashtag", "tagged", "retweet", "share", "comment", "like",
      "subscribe", "notification", "dm", "stalk", "fan", "stan", "support", "hater",
      "troll", "shill", "fud", "spam", "bot", "fake", "clone", "parody", "satire"
    ];

    console.log(`Starting search with ${keywords.length} keywords...`);
    
    let successCount = 0;
    let failedCount = 0;
    let keywordIndex = 0;
    
    for (let keyword of keywords) {
      keywordIndex++;
      try {
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/search?q=${keyword}`,
          { timeout: 40000 }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data?.pairs && Array.isArray(data.pairs)) {
            allPairs = [...allPairs, ...data.pairs];
            successCount++;
            console.log(`✓ [${keywordIndex}/${keywords.length}] ${keyword}: ${data.pairs.length} pairs (total: ${allPairs.length})`);
          }
        } else {
          failedCount++;
          console.log(`✗ [${keywordIndex}/${keywords.length}] ${keyword}: ${response.status}`);
        }
      } catch (e) {
        failedCount++;
        console.log(`✗ [${keywordIndex}/${keywords.length}] ${keyword}: ${e.message}`);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 120));
    }

    console.log(`\nCompleted: ${successCount} successful, ${failedCount} failed out of ${keywords.length}`);
    console.log(`Total pairs collected: ${allPairs.length}`);

    if (!allPairs || allPairs.length === 0) {
      return res.status(500).json({
        error: "No coins found from any keyword",
      });
    }

    // Remove duplicates by mint address
    const uniquePairs = Array.from(
      new Map(allPairs.map(p => [p.baseToken?.address || p.baseToken?.symbol, p])).values()
    );

    console.log(`Unique pairs after dedup: ${uniquePairs.length}`);

    // FILTER: ONLY SMALL CAP COINS
    const filtered = uniquePairs
      .filter((p) => {
        const price = Number(p.priceUsd || 0);
        const marketCap = Number(p.marketCap || 0);
        const liquidity = p.liquidity?.usd || 0;
        
        if (!p.baseToken) return false;
        if (!p.baseToken.symbol || !p.baseToken.name) return false;
        if (!price || price <= 0) return false;
        
        if (marketCap > 10_000_000) return false;
        if (liquidity < 100) return false;
        
        const bigCoins = ["BTC", "ETH", "SOL", "USDC", "USDT", "DAI", "WETH", "WSOL", "BNB", "XRP", "ADA", "BUSD", "USDE", "USDB"];
        if (bigCoins.includes(p.baseToken.symbol.toUpperCase())) return false;
        
        return true;
      })
      .map((p) => {
        const price = Number(p.priceUsd || 0);
        const marketCap = Number(p.marketCap || 0);
        const dexId = p.dexId || "unknown";
        const pairAddress = p.pairAddress || "";
        const baseTokenAddress = p.baseToken?.address || "";
        const chainId = p.chainId || "solana";
        
        // Generate trading links based on DEX and chain
        let buyLinks = {};
        
        if (chainId === "solana") {
          buyLinks = {
            raydium: `https://raydium.io/swap?inputMint=So11111111111111111111111111111111111111112&outputMint=${baseTokenAddress}`,
            orca: `https://www.orca.so/collections/verified?tokenAddress=${baseTokenAddress}`,
            magiceden: `https://magiceden.io/`,
            dexscreener: `https://dexscreener.com/solana/${pairAddress}`
          };
        } else if (chainId === "ethereum") {
          buyLinks = {
            uniswap: `https://app.uniswap.org/#/swap?outputCurrency=${baseTokenAddress}`,
            sushiswap: `https://www.sushi.com/swap`,
            dexscreener: `https://dexscreener.com/ethereum/${pairAddress}`
          };
        } else if (chainId === "polygon") {
          buyLinks = {
            uniswap: `https://app.uniswap.org/#/swap?chain=polygon&outputCurrency=${baseTokenAddress}`,
            quickswap: `https://quickswap.exchange/`,
            dexscreener: `https://dexscreener.com/polygon/${pairAddress}`
          };
        } else if (chainId === "base") {
          buyLinks = {
            uniswap: `https://app.uniswap.org/#/swap?chain=base&outputCurrency=${baseTokenAddress}`,
            aerodrome: `https://app.aerodrome.exchange/`,
            dexscreener: `https://dexscreener.com/base/${pairAddress}`
          };
        } else if (chainId === "arbitrum") {
          buyLinks = {
            uniswap: `https://app.uniswap.org/#/swap?chain=arbitrum&outputCurrency=${baseTokenAddress}`,
            camelot: `https://app.camelotswap.xyz/`,
            dexscreener: `https://dexscreener.com/arbitrum/${pairAddress}`
          };
        } else if (chainId === "bsc") {
          buyLinks = {
            pancakeswap: `https://pancakeswap.finance/swap?outputCurrency=${baseTokenAddress}`,
            sushiswap: `https://www.sushi.com/swap`,
            dexscreener: `https://dexscreener.com/bsc/${pairAddress}`
          };
        } else {
          buyLinks = {
            dexscreener: `https://dexscreener.com/${chainId}/${pairAddress}`
          };
        }
        
        return {
          name: p.baseToken.name,
          price:
            price < 1
              ? `$${price.toFixed(8)}`
              : price < 100
              ? `$${price.toFixed(4)}`
              : `$${price.toFixed(2)}`,
          marketCap: marketCap
            ? marketCap >= 1_000_000
              ? `$${(marketCap / 1_000_000).toFixed(2)}M`
              : marketCap >= 1_000
              ? `$${(marketCap / 1_000).toFixed(2)}K`
              : `$${marketCap.toFixed(2)}`
            : "N/A",
          change24h: p.priceChange?.h24
            ? `${Number(p.priceChange.h24).toFixed(2)}%`
            : "0%",
          chain: chainId,
          dex: dexId,
          icon: p.baseToken.image || "💎",
          liquidity: `$${(p.liquidity?.usd || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
          address: baseTokenAddress,
          buyLinks: buyLinks,
        };
      });

    console.log(`Final filtered coins: ${filtered.length} (market cap < $10M)`);

    if (filtered.length === 0) {
      return res.status(200).json({
        name: "No Coin Found",
        price: "$0",
        marketCap: "N/A",
        change24h: "0%",
        icon: "💎",
        chain: "unknown",
        liquidity: "$0",
        buyLinks: {},
      });
    }

    // 🎲 RANDOM PICK
    const coin = filtered[Math.floor(Math.random() * filtered.length)];
    console.log(`Selected coin: ${coin.name}`);
    
    return res.status(200).json(coin);

  } catch (error) {
    console.error("Fatal error:", error);
    return res.status(500).json({
      error: "Failed to fetch coins",
      message: error.message,
    });
  }
}
