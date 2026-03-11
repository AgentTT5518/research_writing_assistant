import { useQuery } from '@tanstack/react-query';
import { fetchProjects } from '../services';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });
}
