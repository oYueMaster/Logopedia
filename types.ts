
export type CategoryType = 'dia' | 'tarde' | 'noche' | 'varios';

export interface PECSItem {
  id: string;
  name: string;
  image: string;
  category: CategoryType;
}

export type ViewState = 'categories' | 'pecs_list' | 'challenge' | 'sentence_builder' | 'admin_login' | 'admin_panel';

export interface AnalysisResponse {
  status: 'success' | 'retry';
  message: string;
}
