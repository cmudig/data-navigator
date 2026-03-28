<script lang="ts">
    type GuideVariant =
        | 'stack' | 'stack-root' | 'stack-dim-cat' | 'stack-dim-col'
        | 'stack-div-row' | 'stack-div-col' | 'stack-leaf'
        | 'scatter-dim-num' | 'scatter-dim-row' | 'scatter-dim-cat'
        | 'scatter-div-num' | 'scatter-div-row' | 'scatter-div-cat' | 'scatter-leaf'
        | 'tree-root' | 'tree-dim' | 'tree-div' | 'tree-leaf';

    interface Props {
        variant: GuideVariant;
        showRoot?: boolean;
    }

    let { variant, showRoot = true }: Props = $props();
</script>

<figure class="guide-graphic" class:hide-root={!showRoot}>
    {#if variant === 'stack'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <rect x="24.2915" y="36.4199" width="39.4737" height="34.9035" fill="#8FA7E5"/>
            <rect x="182.186" y="66.7725" width="39.4737" height="25.2924" fill="#8FA7E5"/>
            <rect x="24.2915" y="76.3818" width="39.4737" height="34.9035" fill="#6780C0"/>
            <rect x="182.186" y="96.6172" width="39.4737" height="24.7865" fill="#6780C0"/>
            <rect x="24.2915" y="116.345" width="39.4737" height="34.9035" fill="#34519C"/>
            <rect x="182.186" y="125.956" width="39.4737" height="25.2924" fill="#34519C"/>
            <rect x="76.9229" y="131.52" width="39.4737" height="19.7281" fill="#34519C"/>
            <rect x="129.555" y="103.193" width="39.4737" height="48.0556" fill="#34519C"/>
            <rect x="76.9229" y="68.7959" width="39.4737" height="57.1608" fill="#6780C0"/>
            <rect x="129.555" y="51.5967" width="39.4737" height="46.0322" fill="#6780C0"/>
            <rect x="76.9229" y="47.5488" width="39.4737" height="16.1871" fill="#8FA7E5"/>
            <rect x="129.555" y="18.2109" width="39.4737" height="28.3275" fill="#8FA7E5"/>
        </svg>

    {:else if variant === 'stack-root'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <rect x="24.2915" y="36.4199" width="39.4737" height="34.9035" fill="#8FA7E5"/>
            <rect x="182.186" y="66.7725" width="39.4737" height="25.2924" fill="#8FA7E5"/>
            <rect x="24.2915" y="76.3818" width="39.4737" height="34.9035" fill="#6780C0"/>
            <rect x="182.186" y="96.6172" width="39.4737" height="24.7865" fill="#6780C0"/>
            <rect x="24.2915" y="116.345" width="39.4737" height="34.9035" fill="#34519C"/>
            <rect x="182.186" y="125.956" width="39.4737" height="25.2924" fill="#34519C"/>
            <rect x="76.9229" y="131.52" width="39.4737" height="19.7281" fill="#34519C"/>
            <rect x="129.555" y="103.193" width="39.4737" height="48.0556" fill="#34519C"/>
            <rect x="76.9229" y="68.7959" width="39.4737" height="57.1608" fill="#6780C0"/>
            <rect x="129.555" y="51.5967" width="39.4737" height="46.0322" fill="#6780C0"/>
            <rect x="76.9229" y="47.5488" width="39.4737" height="16.1871" fill="#8FA7E5"/>
            <rect x="129.555" y="18.2109" width="39.4737" height="28.3275" fill="#8FA7E5"/>
            <rect x="9" y="9.03809" width="232" height="153" stroke="#1E3369" stroke-width="2"/>
        </svg>

    {:else if variant === 'stack-dim-cat'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <rect x="24.2915" y="36.4209" width="39.4737" height="34.9035" fill="#8FA8E5"/>
            <rect x="182.186" y="66.7725" width="39.4737" height="25.2924" fill="#8FA8E5"/>
            <rect x="24.2915" y="76.3828" width="39.4737" height="34.9035" fill="#6780C0"/>
            <rect x="182.186" y="96.6172" width="39.4737" height="24.7866" fill="#6780C0"/>
            <rect x="24.2915" y="116.345" width="39.4737" height="34.9035" fill="#34519C"/>
            <rect x="182.186" y="125.956" width="39.4737" height="25.2924" fill="#34519C"/>
            <rect x="76.9229" y="131.521" width="39.4737" height="19.7281" fill="#34519C"/>
            <rect x="129.555" y="103.193" width="39.4737" height="48.0556" fill="#34519C"/>
            <rect x="76.9229" y="68.7959" width="39.4737" height="57.1608" fill="#6780C0"/>
            <rect x="129.555" y="51.5967" width="39.4737" height="46.0322" fill="#6780C0"/>
            <rect x="76.9229" y="47.5498" width="39.4737" height="16.1871" fill="#8FA8E5"/>
            <rect x="129.555" y="18.2109" width="39.4737" height="28.3275" fill="#8FA8E5"/>
            <path d="M67.814 32.3746H19.231V156.307H225.709V62.2196H177.632L173.077 13.1523H124.494L120.446 42.9974H71.8625L67.814 32.3746Z" stroke="#1E3369" stroke-width="2"/>
            <path d="M67.814 32.3746H19.231V156.307H225.709V62.2196H177.632L173.077 13.1523H124.494L120.446 42.9974H71.8625L67.814 32.3746Z" stroke="#1E3369" stroke-width="2"/>
            <path d="M67.814 73.8539H19.231V156.307H225.709V94.5937H177.632L173.077 49.0674H124.494L120.446 66.2662H71.8625L67.814 73.8539Z" stroke="#1E3369" stroke-width="2"/>
            <path d="M67.814 113.815H19.231V156.306H225.709V123.932H177.632L173.077 100.157H124.494L120.446 128.485H71.8625L67.814 113.815Z" stroke="#1E3369" stroke-width="2"/>
        </svg>

    {:else if variant === 'stack-dim-col'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <rect x="21.292" y="33.4209" width="45.4737" height="40.9035" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="179.187" y="62.7598" width="45.4737" height="31.2924" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="21.292" y="73.3828" width="45.4737" height="40.9035" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="179.187" y="93.1113" width="45.4737" height="30.7866" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="21.292" y="113.345" width="45.4737" height="40.9035" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="179.187" y="122.956" width="45.4737" height="31.2924" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="73.9233" y="128.521" width="45.4737" height="25.7281" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="126.555" y="100.193" width="45.4737" height="54.0556" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="73.9233" y="66.3008" width="45.4737" height="63.1608" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="126.555" y="49.1025" width="45.4737" height="52.0322" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="73.9233" y="45.0557" width="45.4737" height="22.1871" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="126.555" y="15.7158" width="45.4737" height="34.3275" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="22.292" y="34.4209" width="43.4737" height="38.9035" fill="#8FA7E5" stroke="white" stroke-width="4"/>
            <rect x="180.187" y="63.7598" width="43.4737" height="29.2924" fill="#8FA7E5" stroke="white" stroke-width="4"/>
            <rect x="22.292" y="74.3828" width="43.4737" height="38.9035" fill="#6780C0" stroke="white" stroke-width="4"/>
            <rect x="180.187" y="94.1113" width="43.4737" height="28.7866" fill="#6780C0" stroke="white" stroke-width="4"/>
            <rect x="22.292" y="114.345" width="43.4737" height="38.9035" fill="#34519C" stroke="white" stroke-width="4"/>
            <rect x="180.187" y="123.956" width="43.4737" height="29.2924" fill="#34519C" stroke="white" stroke-width="4"/>
            <rect x="74.9233" y="129.521" width="43.4737" height="23.7281" fill="#34519C" stroke="white" stroke-width="4"/>
            <rect x="127.555" y="101.193" width="43.4737" height="52.0556" fill="#34519C" stroke="white" stroke-width="4"/>
            <rect x="74.9233" y="67.3008" width="43.4737" height="61.1608" fill="#6780C0" stroke="white" stroke-width="4"/>
            <rect x="127.555" y="50.1025" width="43.4737" height="50.0322" fill="#6780C0" stroke="white" stroke-width="4"/>
            <rect x="74.9233" y="46.0557" width="43.4737" height="20.1871" fill="#8FA7E5" stroke="white" stroke-width="4"/>
            <rect x="127.555" y="16.7158" width="43.4737" height="32.3275" fill="#8FA7E5" stroke="white" stroke-width="4"/>
        </svg>

    {:else if variant === 'stack-div-row'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <rect x="24.2915" y="36.4209" width="39.4737" height="34.9035" fill="#8FA8E5"/>
            <rect x="182.186" y="66.7725" width="39.4737" height="25.2924" fill="#8FA8E5"/>
            <rect x="24.2915" y="76.3828" width="39.4737" height="34.9035" fill="#6780C0"/>
            <rect x="182.186" y="96.6172" width="39.4737" height="24.7866" fill="#6780C0"/>
            <rect x="24.2915" y="116.345" width="39.4737" height="34.9035" fill="#34519C"/>
            <rect x="182.186" y="125.956" width="39.4737" height="25.2924" fill="#34519C"/>
            <rect x="76.9229" y="131.521" width="39.4737" height="19.7281" fill="#34519C"/>
            <rect x="129.555" y="103.193" width="39.4737" height="48.0556" fill="#34519C"/>
            <rect x="76.9229" y="68.7959" width="39.4737" height="57.1608" fill="#6780C0"/>
            <rect x="129.555" y="51.5967" width="39.4737" height="46.0322" fill="#6780C0"/>
            <rect x="76.9229" y="47.5498" width="39.4737" height="16.1871" fill="#8FA8E5"/>
            <rect x="129.555" y="18.2109" width="39.4737" height="28.3275" fill="#8FA8E5"/>
            <path d="M225.709 124.5V94.5937H177.632L173.077 49.0674H124.494L120.446 66.2662H71.8625L67.814 73.8539H19.231V114.5" stroke="#1E3369" stroke-width="2"/>
            <path d="M19.231 113.815H67.814L71.8625 128.485H120.446L124.494 100.157H173.077L177.632 123.932H225.709" stroke="#1E3369" stroke-width="2" stroke-linecap="square"/>
        </svg>

    {:else if variant === 'stack-div-col'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <rect x="126.555" y="100.193" width="45.4737" height="54.0556" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="126.555" y="49.1025" width="45.4737" height="52.0322" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="126.555" y="15.7158" width="45.4737" height="34.3275" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="22.292" y="34.4209" width="43.4737" height="38.9035" fill="#8FA7E5" stroke="white" stroke-width="4"/>
            <rect x="180.187" y="63.7598" width="43.4737" height="29.2924" fill="#8FA7E5" stroke="white" stroke-width="4"/>
            <rect x="22.292" y="74.3828" width="43.4737" height="38.9035" fill="#6780C0" stroke="white" stroke-width="4"/>
            <rect x="180.187" y="94.1113" width="43.4737" height="28.7866" fill="#6780C0" stroke="white" stroke-width="4"/>
            <rect x="22.292" y="114.345" width="43.4737" height="38.9035" fill="#34519C" stroke="white" stroke-width="4"/>
            <rect x="180.187" y="123.956" width="43.4737" height="29.2924" fill="#34519C" stroke="white" stroke-width="4"/>
            <rect x="74.9233" y="129.521" width="43.4737" height="23.7281" fill="#34519C" stroke="white" stroke-width="4"/>
            <rect x="127.555" y="101.193" width="43.4737" height="52.0556" fill="#34519C" stroke="white" stroke-width="4"/>
            <rect x="74.9233" y="67.3008" width="43.4737" height="61.1608" fill="#6780C0" stroke="white" stroke-width="4"/>
            <rect x="127.555" y="50.1025" width="43.4737" height="50.0322" fill="#6780C0" stroke="white" stroke-width="4"/>
            <rect x="74.9233" y="46.0557" width="43.4737" height="20.1871" fill="#8FA7E5" stroke="white" stroke-width="4"/>
            <rect x="127.555" y="16.7158" width="43.4737" height="32.3275" fill="#8FA7E5" stroke="white" stroke-width="4"/>
        </svg>

    {:else if variant === 'stack-leaf'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <rect x="129.555" y="18.7158" width="39.4737" height="28.3275" fill="#8FA7E5"/>
            <rect x="24.2915" y="36.4209" width="39.4737" height="34.9035" fill="#8FA7E5"/>
            <rect x="182.186" y="65.7598" width="39.4737" height="25.2924" fill="#8FA7E5"/>
            <rect x="24.2915" y="76.3828" width="39.4737" height="34.9035" fill="#6780C0"/>
            <rect x="182.186" y="96.1113" width="39.4737" height="24.7866" fill="#6780C0"/>
            <rect x="24.2915" y="116.345" width="39.4737" height="34.9035" fill="#34519C"/>
            <rect x="182.186" y="125.956" width="39.4737" height="25.2924" fill="#34519C"/>
            <rect x="76.9229" y="131.521" width="39.4737" height="19.7281" fill="#34519C"/>
            <rect x="129.555" y="103.193" width="39.4737" height="48.0556" fill="#34519C"/>
            <rect x="76.9229" y="69.3008" width="39.4737" height="57.1608" fill="#6780C0"/>
            <rect x="126.555" y="49.1025" width="45.4737" height="52.0322" fill="#6780C0" stroke="#1E3369" stroke-width="6"/>
            <rect x="76.9229" y="48.0557" width="39.4737" height="16.1871" fill="#8FA7E5"/>
            <rect x="127.555" y="50.1025" width="43.4737" height="50.0322" fill="#6780C0" stroke="white" stroke-width="4"/>
        </svg>

    {:else if variant === 'scatter-dim-num'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <circle cx="113.5" cy="103.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="124.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="93.5" r="10.5" fill="#6780C0"/>
            <circle cx="158.5" cy="104.5" r="10.5" fill="#6780C0"/>
            <circle cx="206.5" cy="72.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="62.5" cy="92.5" r="10.5" fill="#34519C"/>
            <circle cx="49.5" cy="145.5" r="10.5" fill="#34519C"/>
            <circle cx="86.5" cy="140.5" r="10.5" fill="#34519C"/>
            <circle cx="65.5" cy="125.5" r="10.5" fill="#34519C"/>
            <circle cx="175.5" cy="72.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="175.5" cy="129.5" r="10.5" fill="#6780C0"/>
            <circle cx="199.5" cy="31.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="38.5" cy="113.5" r="10.5" fill="#34519C"/>
            <line x1="17.5" y1="19" x2="17.5" y2="159" stroke="#6780C0"/>
            <line x1="230" y1="159.5" x2="17" y2="159.5" stroke="#6780C0"/>
            <rect x="124" y="19" width="53" height="140" stroke="#1E3369" stroke-width="2"/>
            <rect x="71" y="19" width="53" height="140" stroke="#1E3369" stroke-width="2"/>
            <rect x="18" y="19" width="53" height="140" stroke="#1E3369" stroke-width="2"/>
            <rect x="177" y="19" width="53" height="140" stroke="#1E3369" stroke-width="2"/>
        </svg>

    {:else if variant === 'scatter-dim-row'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <circle cx="113.5" cy="103.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="124.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="93.5" r="10.5" fill="#6780C0"/>
            <circle cx="158.5" cy="104.5" r="10.5" fill="#6780C0"/>
            <circle cx="206.5" cy="72.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="62.5" cy="92.5" r="10.5" fill="#34519C"/>
            <circle cx="49.5" cy="145.5" r="10.5" fill="#34519C"/>
            <circle cx="86.5" cy="140.5" r="10.5" fill="#34519C"/>
            <circle cx="65.5" cy="125.5" r="10.5" fill="#34519C"/>
            <circle cx="175.5" cy="72.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="175.5" cy="129.5" r="10.5" fill="#6780C0"/>
            <circle cx="199.5" cy="31.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="38.5" cy="113.5" r="10.5" fill="#34519C"/>
            <line x1="17.5" y1="19" x2="17.5" y2="159" stroke="#6780C0"/>
            <line x1="230" y1="159.5" x2="17" y2="159.5" stroke="#6780C0"/>
            <rect x="18" y="54" width="212" height="35" stroke="#1E3369" stroke-width="2"/>
            <rect x="18" y="89" width="212" height="35" stroke="#1E3369" stroke-width="2"/>
            <rect x="18" y="124" width="212" height="35" stroke="#1E3369" stroke-width="2"/>
            <rect x="18" y="19" width="212" height="35" stroke="#1E3369" stroke-width="2"/>
        </svg>

    {:else if variant === 'scatter-dim-cat'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <circle cx="113.5" cy="103.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="124.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="93.5" r="10.5" fill="#6780C0"/>
            <circle cx="158.5" cy="104.5" r="10.5" fill="#6780C0"/>
            <circle cx="206.5" cy="72.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="62.5" cy="92.5" r="10.5" fill="#34519C"/>
            <circle cx="49.5" cy="145.5" r="10.5" fill="#34519C"/>
            <circle cx="86.5" cy="140.5" r="10.5" fill="#34519C"/>
            <circle cx="65.5" cy="125.5" r="10.5" fill="#34519C"/>
            <circle cx="175.5" cy="72.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="175.5" cy="129.5" r="10.5" fill="#6780C0"/>
            <circle cx="199.5" cy="31.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="38.5" cy="113.5" r="10.5" fill="#34519C"/>
            <line x1="17.5" y1="19" x2="17.5" y2="159" stroke="#6780C0"/>
            <line x1="230" y1="159.5" x2="17" y2="159.5" stroke="#6780C0"/>
            <rect x="100" y="79" width="89" height="64" stroke="#1E3369" stroke-width="2"/>
            <rect x="23" y="78" width="77" height="81" stroke="#1E3369" stroke-width="2"/>
            <rect x="161" y="19" width="69" height="68" stroke="#1E3369" stroke-width="2"/>
        </svg>

    {:else if variant === 'scatter-div-num'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <circle cx="113.5" cy="103.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="124.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="93.5" r="10.5" fill="#6780C0"/>
            <circle cx="158.5" cy="104.5" r="10.5" fill="#6780C0"/>
            <circle cx="206.5" cy="72.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="62.5" cy="92.5" r="10.5" fill="#34519C"/>
            <circle cx="49.5" cy="145.5" r="10.5" fill="#34519C"/>
            <circle cx="86.5" cy="140.5" r="10.5" fill="#34519C"/>
            <circle cx="65.5" cy="125.5" r="10.5" fill="#34519C"/>
            <circle cx="175.5" cy="72.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="175.5" cy="129.5" r="10.5" fill="#6780C0"/>
            <circle cx="199.5" cy="31.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="38.5" cy="113.5" r="10.5" fill="#34519C"/>
            <line x1="17.5" y1="19" x2="17.5" y2="159" stroke="#6780C0"/>
            <line x1="230" y1="159.5" x2="17" y2="159.5" stroke="#6780C0"/>
            <rect x="124" y="19" width="53" height="140" stroke="#1E3369" stroke-width="2"/>
        </svg>

    {:else if variant === 'scatter-div-row'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <circle cx="113.5" cy="103.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="124.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="93.5" r="10.5" fill="#6780C0"/>
            <circle cx="158.5" cy="104.5" r="10.5" fill="#6780C0"/>
            <circle cx="206.5" cy="72.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="62.5" cy="92.5" r="10.5" fill="#34519C"/>
            <circle cx="49.5" cy="145.5" r="10.5" fill="#34519C"/>
            <circle cx="86.5" cy="140.5" r="10.5" fill="#34519C"/>
            <circle cx="65.5" cy="125.5" r="10.5" fill="#34519C"/>
            <circle cx="175.5" cy="72.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="175.5" cy="129.5" r="10.5" fill="#6780C0"/>
            <circle cx="199.5" cy="31.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="38.5" cy="113.5" r="10.5" fill="#34519C"/>
            <line x1="17.5" y1="19" x2="17.5" y2="159" stroke="#6780C0"/>
            <line x1="230" y1="159.5" x2="17" y2="159.5" stroke="#6780C0"/>
            <rect x="18" y="54" width="212" height="35" stroke="#1E3369" stroke-width="2"/>
        </svg>

    {:else if variant === 'scatter-div-cat'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <circle cx="113.5" cy="103.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="124.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="93.5" r="10.5" fill="#6780C0"/>
            <circle cx="158.5" cy="104.5" r="10.5" fill="#6780C0"/>
            <circle cx="206.5" cy="72.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="62.5" cy="92.5" r="10.5" fill="#34519C"/>
            <circle cx="49.5" cy="145.5" r="10.5" fill="#34519C"/>
            <circle cx="86.5" cy="140.5" r="10.5" fill="#34519C"/>
            <circle cx="65.5" cy="125.5" r="10.5" fill="#34519C"/>
            <circle cx="175.5" cy="72.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="175.5" cy="129.5" r="10.5" fill="#6780C0"/>
            <circle cx="199.5" cy="31.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="38.5" cy="113.5" r="10.5" fill="#34519C"/>
            <line x1="17.5" y1="19" x2="17.5" y2="159" stroke="#6780C0"/>
            <line x1="230" y1="159.5" x2="17" y2="159.5" stroke="#6780C0"/>
            <rect x="161" y="19" width="69" height="68" stroke="#1E3369" stroke-width="2"/>
        </svg>

    {:else if variant === 'scatter-leaf'}
        <svg width="250" height="173" viewBox="0 0 250 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="250" height="173" fill="white"/>
            <circle cx="113.5" cy="103.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="124.5" r="10.5" fill="#6780C0"/>
            <circle cx="134.5" cy="93.5" r="10.5" fill="#6780C0"/>
            <circle cx="158.5" cy="104.5" r="10.5" fill="#6780C0"/>
            <circle cx="206.5" cy="72.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="62.5" cy="92.5" r="10.5" fill="#34519C"/>
            <circle cx="49.5" cy="145.5" r="10.5" fill="#34519C"/>
            <circle cx="86.5" cy="140.5" r="10.5" fill="#34519C"/>
            <circle cx="65.5" cy="125.5" r="10.5" fill="#34519C"/>
            <circle cx="175.5" cy="72.5" r="13.5" fill="#8FA7E5" stroke="#1E3369" stroke-width="6"/>
            <circle cx="175.5" cy="72.5" r="12.5" fill="#8FA7E5" stroke="white" stroke-width="4"/>
            <circle cx="175.5" cy="129.5" r="10.5" fill="#6780C0"/>
            <circle cx="199.5" cy="31.5" r="10.5" fill="#8FA7E5"/>
            <circle cx="38.5" cy="113.5" r="10.5" fill="#34519C"/>
            <line x1="17.5" y1="19" x2="17.5" y2="159" stroke="#6780C0"/>
            <line x1="230" y1="159.5" x2="17" y2="159.5" stroke="#6780C0"/>
        </svg>

    {:else if variant === 'tree-root'}
        <svg width="173" height="173" viewBox="0 0 173 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="173" height="173" fill="white"/>
            <line x1="87.4336" y1="32.2216" x2="65.0913" y2="71.1405" stroke="#8FA7E5"/>
            <line x1="65.0943" y1="71.1344" x2="43.4727" y2="110.053" stroke="#8FA7E5"/>
            <line x1="42.7525" y1="110.053" x2="21.1309" y2="148.972" stroke="#8FA7E5"/>
            <line x1="108.184" y1="71.1344" x2="86.5624" y2="32.2155" stroke="#8FA7E5"/>
            <line x1="86.5664" y1="110.059" x2="64.224" y2="71.1406" stroke="#8FA7E5"/>
            <line x1="64.2236" y1="148.978" x2="41.8813" y2="110.06" stroke="#8FA7E5"/>
            <line x1="130.712" y1="110.242" x2="64.4054" y2="71.3228" stroke="#8FA7E5"/>
            <line x1="108.368" y1="149.161" x2="42.0617" y2="110.242" stroke="#8FA7E5"/>
            <line x1="152.419" y1="149.201" x2="42.869" y2="110.282" stroke="#8FA7E5"/>
            <circle cx="86.6398" cy="31.6115" r="7.06757" fill="#34519C" stroke="#1E3369"/>
            <circle cx="64.2971" cy="70.5314" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="108.261" cy="70.5314" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="42.676" cy="109.449" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="20.3322" cy="148.369" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="86.6398" cy="109.449" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="64.2971" cy="148.369" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="108.261" cy="148.369" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="130.603" cy="109.449" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="152.225" cy="148.369" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <rect x="6" y="18" width="162" height="27.2252" rx="13" stroke="#1E3369" stroke-width="2"/>
        </svg>

    {:else if variant === 'tree-dim'}
        <svg width="173" height="173" viewBox="0 0 173 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="173" height="173" fill="white"/>
            <line class="root" x1="87.4336" y1="29.1767" x2="65.0913" y2="68.0956" stroke="#8FA7E5"/>
            <line x1="65.0943" y1="68.0895" x2="43.4727" y2="107.008" stroke="#8FA7E5"/>
            <line x1="42.7525" y1="107.008" x2="21.1309" y2="145.927" stroke="#8FA7E5"/>
            <line class="root" x1="108.185" y1="68.0895" x2="86.5634" y2="29.1706" stroke="#8FA7E5"/>
            <line x1="86.5664" y1="107.015" x2="64.224" y2="68.0956" stroke="#8FA7E5"/>
            <line x1="64.2236" y1="145.934" x2="41.8813" y2="107.015" stroke="#8FA7E5"/>
            <line x1="130.711" y1="107.197" x2="64.4045" y2="68.2779" stroke="#8FA7E5"/>
            <line x1="108.369" y1="146.116" x2="42.0627" y2="107.197" stroke="#8FA7E5"/>
            <line x1="152.419" y1="146.156" x2="42.869" y2="107.237" stroke="#8FA7E5"/>
            <circle class="root" cx="86.6398" cy="28.5676" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="64.2971" cy="67.4865" r="7.06757" fill="#34519C" stroke="#1E3369"/>
            <circle cx="108.261" cy="67.4865" r="7.06757" fill="#34519C" stroke="#1E3369"/>
            <circle cx="42.676" cy="106.405" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="20.3332" cy="145.324" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="86.6398" cy="106.405" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="64.2971" cy="145.324" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="108.261" cy="145.324" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="130.604" cy="106.405" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="152.226" cy="145.324" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <rect x="6" y="53.874" width="162" height="27.2252" rx="13" stroke="#1E3369" stroke-width="2"/>
        </svg>

    {:else if variant === 'tree-div'}
        <svg width="173" height="173" viewBox="0 0 173 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="173" height="173" fill="white"/>
            <line class="root" x1="87.4336" y1="29.1767" x2="65.0913" y2="68.0956" stroke="#8FA7E5"/>
            <line x1="65.0943" y1="68.0895" x2="43.4727" y2="107.008" stroke="#8FA7E5"/>
            <line x1="42.7525" y1="107.008" x2="21.1309" y2="145.927" stroke="#8FA7E5"/>
            <line class="root" x1="108.185" y1="68.0895" x2="86.5634" y2="29.1706" stroke="#8FA7E5"/>
            <line x1="86.5664" y1="107.015" x2="64.224" y2="68.0956" stroke="#8FA7E5"/>
            <line x1="64.2236" y1="145.934" x2="41.8813" y2="107.015" stroke="#8FA7E5"/>
            <line x1="130.711" y1="107.197" x2="64.4045" y2="68.2779" stroke="#8FA7E5"/>
            <line x1="108.369" y1="146.116" x2="42.0627" y2="107.197" stroke="#8FA7E5"/>
            <line x1="152.419" y1="146.156" x2="42.869" y2="107.237" stroke="#8FA7E5"/>
            <circle class="root" cx="86.6398" cy="28.5676" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="64.2971" cy="67.4865" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="108.261" cy="67.4865" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="42.676" cy="106.405" r="7.06757" fill="#34519C" stroke="#1E3369"/>
            <circle cx="20.3332" cy="145.324" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="86.6398" cy="106.405" r="7.06757" fill="#34519C" stroke="#1E3369"/>
            <circle cx="64.2971" cy="145.324" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="108.261" cy="145.324" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="130.604" cy="106.405" r="7.06757" fill="#34519C" stroke="#1E3369"/>
            <circle cx="152.226" cy="145.324" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <rect x="6" y="92.793" width="162" height="27.2252" rx="13" stroke="#1E3369" stroke-width="2"/>
        </svg>

    {:else if variant === 'tree-leaf'}
        <svg width="173" height="173" viewBox="0 0 173 173" fill="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect width="173" height="173" fill="white"/>
            <line class="root" x1="87.4336" y1="26.1767" x2="65.0913" y2="65.0956" stroke="#8FA7E5"/>
            <line x1="65.0943" y1="65.0895" x2="43.4727" y2="104.008" stroke="#8FA7E5"/>
            <line x1="42.7525" y1="104.008" x2="21.1309" y2="142.927" stroke="#8FA7E5"/>
            <line class="root" x1="108.185" y1="65.0895" x2="86.5634" y2="26.1706" stroke="#8FA7E5"/>
            <line x1="86.5664" y1="104.015" x2="64.224" y2="65.0956" stroke="#8FA7E5"/>
            <line x1="64.2236" y1="142.934" x2="41.8813" y2="104.015" stroke="#8FA7E5"/>
            <line x1="130.711" y1="104.197" x2="64.4045" y2="65.2779" stroke="#8FA7E5"/>
            <line x1="108.369" y1="143.116" x2="42.0627" y2="104.197" stroke="#8FA7E5"/>
            <line x1="152.419" y1="143.156" x2="42.869" y2="104.237" stroke="#8FA7E5"/>
            <circle class="root" cx="86.6398" cy="25.5676" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="64.2971" cy="64.4865" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="108.261" cy="64.4865" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="42.676" cy="103.405" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="20.3332" cy="142.324" r="7.06757" fill="#34519C" stroke="#1E3369"/>
            <circle cx="86.6398" cy="103.405" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="64.2971" cy="142.324" r="7.06757" fill="#34519C" stroke="#1E3369"/>
            <circle cx="108.261" cy="142.324" r="7.06757" fill="#34519C" stroke="#1E3369"/>
            <circle cx="130.604" cy="103.405" r="7.06757" fill="#8FA7E5" stroke="#1E3369"/>
            <circle cx="152.226" cy="142.324" r="7.06757" fill="#34519C" stroke="#1E3369"/>
            <rect x="6" y="128.712" width="162" height="27.2252" rx="13" stroke="#1E3369" stroke-width="2"/>
        </svg>
    {/if}
</figure>

<style>
    .guide-graphic {
        margin: 0;
        padding: 0;
        line-height: 0;
    }

    .guide-graphic svg {
        display: block;
        width: 100%;
        height: auto;
        border-radius: 4px;
    }

    .hide-root :global(.root) {
        display: none;
    }
</style>
