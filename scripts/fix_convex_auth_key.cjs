const { execSync } = require('child_process');

const KEY_1 = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCgJy6Pl9e2sxFC
7sIzuNw3DRamHHP8RrkAA7+IksgyN1SPSq27qaPnossgvsBk+C3zCNtYIZ6w68pV
OnbpiZyG4mSelMn1E72BJSZRdxLXv9emqIA1CPmP67ekaG9ktX4XBQtdBtbhIVud
adGvtl1Hp+BHNrHo5RVB+e7CbzIiPMwG39GhhSLArEXonjgqLgPhiV1XHK8hQkHa
fB4fUu3lqiAXKY5wQZiGTZ0xTSzWvEzHnY/WYcdtkwfEPefkBqCV1ROSOcRPJfxy
p38NXtkjrHrsP08EzwmzWFXcBqPwLtGL47nw/rnUmiHaAzlHQ3KQ/FDxdp4I0xzO
7Xb8YHnNAgMBAAECggEAHg3MSIkTo4buDdP1YLRnqvMLVYfQYj65V93cMxpsdDP6
69r1SFq41e6wVMhHHYuPP+ThGKRSfdv5v821Y/T9iThx7mp4jcOzE8mva6k/QXqQ
Uwea65jwEEiJUVKB2PHQJCy/qajvaRcT9LHXdjRwQ9KmnWaPs2dN+nAXFKi+TTs0
WW2uhzyBAT4hsrqCNNPGmCmcGyLs2kn0mEx8BhNmN5bg0qJWUn7h+mKD7dE8VBPI
QPJg3dkWZTn044E1ZcH0p1FB13KOc2c28biIppG6+bSplZfFxyRHwsgtGo/rFm38
wL7ymdxcz2aLQeywY3mDqL7RWNhRLfy0N245e5xYBwKBgQDYlMDeIveGyXP6f7I3
I/isAS4cZYK7DfFfWR3az9qBR78XQWajfKzhs406xzYOxqIQAzblyQv5pgHHd187
mUl7iGlig5KzrciCDEboogGhkWmEOn7l21qXCH7V29/iC6v18plTmPneLcHsQ20j
PWAaIYlIKx+UPxASj16W/pwowwKBgQC9TUGEKgKZFoi3d10TTcB0h8A2woQWQAgg
X8/YvnXjm/L052OKttuSIVnkfocaH0uoMQOIu2qil1dBtMTCe2XzRDAv5HuACTXh
NZC3Pk0K3wwZJi+0LCuLIn+pmHKofYumCRjfU+ieQDTF1IjR7+mLstm/JZP+/SsV
Ec6H3JcqLwKBgQC5OdcM49jP9KB03xsan3AAIu49qO86bL0+r2eiCFu2bxbVm8Bd
F7Z/POEPIOpxjp1xll4v/VZ5hulEnynaPcmjldGTSDWB56Fw33ERaeR9OnCEfsai
bIw4WTKoUehSWWsS6A0LeuxPgNC18CB5n/b9wiq3hvH2Bk0HoofiGRSSowKBgCgE
Uts7fj0adGBETVqtTwfTQqDQ0ddaRd2CI4/wAz/QUbXPzE0ghp4HitcwoCK3hujR
I6wd4lbooztymT17lHuuaHlXVXwldkxbZHI4K1Um/Ym7ds4hoDrTWiVh4qsXjxPU
THu5Yy1A6WcAnMO0caxkbH9p1DVNE3RqxTwXN6VlAoGAdBvw9UJsQCXxu0hY+7uU
dlU/VUnRMbe+gXJafAmbXtcZ2qQX0hujgXYHZrHn+vHkE4iV0u1IARZ71jmHghFa
0dpoORBdDaMsUXVB/AF4aNjge2+eogD+JbmQPqvTc5khxC+ZKgG3MC4jP06iY9iD
ktkZUbHKUfn9ecTs62K2itQ
-----END PRIVATE KEY-----`.trim();

async function main() {
    try {
        console.log('Setting CONVEX_AUTH_PRIVATE_KEY env var...');

        // Use single quotes for the env value to avoid shell expansion of special chars
        // Double escapement for single quotes
        const safeKey = KEY_1.replace(/'/g, "'\"'\"'");

        execSync(`npx convex env set CONVEX_AUTH_PRIVATE_KEY='${safeKey}'`, { stdio: 'inherit', encoding: 'utf8' });

        console.log('✅ CONVEX_AUTH_PRIVATE_KEY set successfully.');
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

main();
