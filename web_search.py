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
    try:
        with DDGS() as ddgs:
            # Use generator and manually list/slice to be safer
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

    # 2. Research Phase (Scrape Top 3)
    final_data = []
    
    for idx, item in enumerate(search_results[:3]):
        url = item.get('href')
        title = item.get('title')
        snippet = item.get('body')
        
        scraped_content = ""
        try:
            # Fetch page with timeout
            resp = requests.get(url, headers=HEADERS, timeout=3)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.content, 'html.parser')
                
                # Extract paragraphs (simple heuristic)
                paras = soup.find_all('p')
                text_chunks = [p.get_text().strip() for p in paras if len(p.get_text().strip()) > 50]
                
                # Limit to first 2000 chars of actual content to save context window
                full_text = " ".join(text_chunks)
                scraped_content = full_text[:2000] + "..." if len(full_text) > 2000 else full_text
        except Exception:
            scraped_content = "(Failed to scrape content, using snippet only)"

        final_data.append({
            "title": title,
            "url": url,
            "snippet": snippet,
            "content": scraped_content if scraped_content else snippet
        })

    return {"results": final_data}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No query provided"}))
        sys.exit(1)
    
    query = sys.argv[1]
    result = search_and_scrape(query)
    print(json.dumps(result, indent=2))
