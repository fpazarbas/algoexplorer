import os

path = '/Users/fatih/Documents/GitHub/algoexplorer/src/pages/explorer.tsx'
with open(path, 'r') as f:
    content = f.read()

old_content = """                let timeLabel = '';
                 else if (filter === '1W') {"""

# Try a more robust search
if 'let timeLabel = \'\';' in content:
    print("Found timeLabel")
    # We'll replace the block manually
    start_search = 'let timeLabel = \'\';'
    end_search = 'newChartData.push({'
    
    start_idx = content.find(start_search)
    end_idx = content.find(end_search, start_idx)
    
    if start_idx != -1 and end_idx != -1:
        new_block = """let timeLabel = '';
                if (filter === '24H') timeLabel = format(new Date(Date.now() - (tcs.length - 1 - i) * (blocksPerPoint * 3.3 * 1000)), 'HH:mm');
                else if (filter === '1W') {
                   const d = new Date(Date.now() - (tcs.length - 1 - i) * (blocksPerPoint * 3.3 * 1000));
                   timeLabel = format(d, 'dd MMM') + (i % 2 === 0 ? ' PM' : ' AM');
                }
                else if (filter === 'ALL') timeLabel = (2018 + i).toString();
                else if (filter === '1Y' || filter === '6M' || filter === 'YTD') {
                   const d = subMonths(new Date(), tcs.length - 1 - i);
                   timeLabel = format(d, 'MMM') + (filter === '1Y' && i === 1 ? (" '" + format(d, 'yy')) : "");
                }
                else timeLabel = format(new Date(Date.now() - (tcs.length - 1 - i) * (blocksPerPoint * 3.3 * 1000)), 'dd MMM');
                
                """
        content = content[:start_idx] + new_block + content[end_idx:]
        with open(path, 'w') as f:
            f.write(content)
        print("Successfully updated file")
    else:
        print("Could not find start or end index")
else:
    print("Could not find old content")
