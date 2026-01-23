import type { Nota } from './types';

export const notas: Nota[] = [
  {
    id: '1',
    title: 'Meeting with Client A',
    content: 'Discussed the new project proposal and timeline. Key takeaways: budget needs to be revised, and the marketing team needs to be looped in for the initial campaign strategy. The client seemed pleased with the overall direction but emphasized the need for a quick turnaround on the revised proposal. Follow-up meeting scheduled for next Tuesday.',
    createdAt: new Date('2024-07-20T10:00:00Z').toISOString(),
  },
  {
    id: '2',
    title: 'Brainstorming Session for Q3',
    content: 'Team brainstorming for Q3 goals. Ideas included expanding into the European market, launching a new feature for the mobile app called "Quick-Add", and improving customer support response times. We categorized ideas using a priority matrix. Top priorities are Quick-Add feature and customer support improvements. John will lead the Quick-Add task force, and Sarah will oversee the support team overhaul.',
    createdAt: new Date('2024-07-19T14:30:00Z').toISOString(),
  },
  {
    id: '3',
    title: 'Technical Scoping - API Integration',
    content: 'Technical meeting to scope the integration of the new payment gateway API. The API uses OAuth 2.0 for authentication. We will need to create a new service to handle token exchange and refresh. The backend team will handle this, while the frontend team will build the UI components for the payment flow. The estimated time for completion is 3 sprints. We identified a potential bottleneck with the third-party sandbox environment, which has been unreliable. We need a contingency plan.',
    createdAt: new Date('2024-07-18T09:00:00Z').toISOString(),
  },
  {
    id: '4',
    title: 'User Feedback Review',
    content: 'Reviewed user feedback from the last month. Common themes include requests for a dark mode, confusion about the pricing page, and praise for the new dashboard design. We decided to prioritize the dark mode implementation as it is a highly requested feature and relatively low effort. The pricing page will be A/B tested with a new design to improve clarity. We will send a thank you email to users who provided feedback.',
    createdAt: new Date('2024-07-15T11:00:00Z').toISOString(),
  },
    {
    id: '5',
    title: 'Long Nota for Summarization Test',
    content: 'This is a deliberately long and detailed nota designed to test the effectiveness of the AI summarization feature. The meeting covered the quarterly financial results, which were largely positive, showing a 15% year-over-year growth in revenue. However, the operational costs also increased by 20%, primarily due to investment in new infrastructure and hiring. The marketing department presented their new campaign, "Connect & Grow," which aims to increase user engagement by 25% over the next six months. The campaign will leverage social media influencers and targeted digital advertising. The product development team provided an update on the upcoming release, version 3.0, which is on track for a September launch. This release will include the much-anticipated "Teams" feature, allowing for collaborative work within the platform. There was a lengthy discussion about potential risks, including increased competition and the aformentioned operational cost growth. Mitigation strategies were proposed, such as optimizing cloud resource usage and exploring partnerships to reduce customer acquisition costs. The CEO concluded the meeting by reiterating the company\'s commitment to innovation and customer satisfaction, and expressed confidence in the team\'s ability to navigate the challenges ahead. Action items were assigned: the finance team is to conduct a detailed analysis of operational costs and present findings in two weeks; the marketing team is to finalize the "Connect & Grow" campaign budget; and the product team is to prepare a detailed demo of the "Teams" feature for the next all-hands meeting.',
    createdAt: new Date('2024-07-12T16:00:00Z').toISOString(),
  },
];

export async function getNotas(): Promise<Nota[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return notas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getNotaById(id: string): Promise<Nota | undefined> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return notas.find(nota => nota.id === id);
}
