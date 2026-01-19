import sys
import json
import ssl
import requests
from bs4 import BeautifulSoup
from ddgs import DDGS

# ---------------------------------------------------------
# SSL & User-Agent Configuration (Bypass common blocks)
# ---------------------------------------------------------
ssl._create_default_https_context = ssl._create_unverified_context

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def search_and_scrape(query):
    results = []
    
    # 1. Search Phase
    search_results = []
    
    # Check for news/time-sensitive keywords
    news_keywords = ['news', 'latest', 'current', 'today', 'yesterday', 'now', 'update', 'match', 'score', 'result', 'winner', 'won', 'live']
    is_news = any(k in query.lower() for k in news_keywords)
    
    if is_news:
        try:
            # Region detection
            region = 'wt-wt'
            if 'india' in query.lower() or 'ind vs' in query.lower() or 'bcci' in query.lower():
                region = 'in-en'
            
            with DDGS() as ddgs:
                # Use news search for better freshness
                news_gen = ddgs.news(query, region=region, safesearch='off', max_results=10)
                
                # Materialize list
                news_list = list(news_gen)
                
                # Fallback to global if regional empty
                if not news_list and region != 'wt-wt':
                    news_list = list(ddgs.news(query, region='wt-wt', safesearch='off', max_results=10))

                # Debug logging
                for n in news_list:
                    sys.stderr.write(f"DEBUG: Found news ({region}): {n.get('date')} - {n.get('title')}\n")

                # Sort by date descending (newest first). Handle None/Empty.
                sorted_news = sorted(news_list, key=lambda x: x.get('date') or '1900-01-01', reverse=True)
                
                for r in sorted_news:
                    # Normalize news result structure
                    search_results.append({
                        'title': r.get('title'),
                        'href': r.get('url'),
                        'body': r.get('body') or r.get('snippet', ''),
                        'date': r.get('date')
                    })
        except Exception as e:
            pass

    # Fallback to Text Search if no news results or not a news query
    if not search_results:
        try:
            with DDGS() as ddgs:
                # Use generator and manually list/slice
                results_gen = ddgs.text(query)
                for r in results_gen:
                    search_results.append(r)
                    if len(search_results) >= 5:
                        break
        except Exception as e:
            return {"error": f"Search failed: {str(e)}", "results": []}

    if not search_results:
        # Fallback: Try one more time with region='us-en' if generic failed
        try:
            with DDGS() as ddgs:
                results_gen = ddgs.text(query, region='us-en')
                for r in results_gen:
                    search_results.append(r)
                    if len(search_results) >= 5:
                        break
        except:
            pass
            
    if not search_results:
        return {"error": "No results found (DDG might be rate-limiting)", "results": []}

    # 2. Research Phase (Scrape Parallelly)
    if not search_results:
        return {"error": "No results found", "results": []}

    import concurrent.futures

    def scrape_url(item):
        url = item.get('href')
        title = item.get('title')
        snippet = item.get('body')
        
        scraped_content = ""
        try:
            # Reduced timeout to 2s for speed
            resp = requests.get(url, headers=HEADERS, timeout=2)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.content, 'html.parser')
                paras = soup.find_all('p')
                text_chunks = [p.get_text().strip() for p in paras if len(p.get_text().strip()) > 50]
                full_text = " ".join(text_chunks)
                # Limit content to 1500 chars
                scraped_content = full_text[:1500] + "..." if len(full_text) > 1500 else full_text
        except Exception:
            pass
            
        return {
            "title": title,
            "url": url,
            "snippet": snippet,
            "content": scraped_content if scraped_content else snippet
        }

    # Parallel execution for top 2 results only to catch the most relevant info FAST
    final_data = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(scrape_url, item) for item in search_results[:2]]
        for future in concurrent.futures.as_completed(futures):
            try:
                final_data.append(future.result())
            except:
                pass

    return {"results": final_data}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No query provided"}))
        sys.exit(1)
    
    query = sys.argv[1]
    result = search_and_scrape(query)
    print(json.dumps(result, indent=2))
