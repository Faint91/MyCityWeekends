# UI Checklist (Mobile-first)

## Viewports to test every feature
- Mobile: 390x844 (iPhone 12/13), 375x812, 360x800
- Desktop: 1440x900

## Must-pass checks (every PR)
### Layout & navigation
- [ ] No horizontal scrolling on mobile
- [ ] Bottom nav visible on mobile and does NOT cover content (content has enough bottom padding)
- [ ] Active tab state is clear
- [ ] Navigation works with keyboard (Tab/Enter) on desktop

### Content & readability
- [ ] Top 3 picks are visible quickly (no huge header pushing them down)
- [ ] Event cards: title readable, price visible, time + location visible
- [ ] Text does not overflow / clip / overlap on small screens
- [ ] Tap targets are comfortable (buttons/links not tiny)

### Interactions (mobile)
- [ ] No hover-only interactions required
- [ ] Links are easy to tap (no accidental taps)
- [ ] Modals/drawers (if any) scroll correctly and can be closed

### Performance basics
- [ ] Images optimized (Next Image where applicable)
- [ ] No large layout shifts when page loads (avoid jumping content)
- [ ] Page is usable on “Slow 4G” throttling

### Accessibility quick checks
- [ ] Buttons/links have clear labels (aria-label if icon-only)
- [ ] Focus styles are visible on desktop
- [ ] Color contrast is reasonable (don’t rely on color alone)

## Recommended quick QA flow
1) Open homepage on 390px width
2) Scroll: confirm no sideways scroll + bottom nav never covers cards
3) Tap each bottom nav item and confirm correct page loads
4) Open an event detail page (when available) and repeat