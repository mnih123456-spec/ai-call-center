export const features = [
  { id: 'voicebot.backend', title: 'Dostęp do panelu voicebota', module: 'voicebot' },
  { id: 'voicebot.campaigns.view', title: 'Podgląd kampanii głosowych', module: 'voicebot' },
  {
    id: 'voicebot.campaigns.manage',
    title: 'Zarządzanie kampaniami głosowymi',
    module: 'voicebot',
    dependsOn: ['voicebot.campaigns.view'],
  },
  { id: 'voicebot.calls.view', title: 'Podgląd połączeń i wyników', module: 'voicebot' },
  {
    id: 'voicebot.calls.start',
    title: 'Zlecanie połączeń',
    module: 'voicebot',
    dependsOn: ['voicebot.calls.view'],
  },
]
export default features
