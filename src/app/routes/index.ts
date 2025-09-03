import { Router } from 'express';
import { AuthRoutes } from '../modules/Auth/auth.route';
import { EventRoutes } from '../modules/Event/event.route';
import { UserRoutes } from '../modules/User/user.route';



const router = Router();

const moduleRoutes = [
  
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/event',
    route: EventRoutes,
  },
  {
    path: '/users',
    route: UserRoutes,
  },
 
 
 
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
