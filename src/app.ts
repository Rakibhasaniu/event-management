/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import globalErrorHandler from './app/middlewares/globalErrorhandler';
import notFound from './app/middlewares/notFound';
import router from './app/routes';

const app: Application = express();

//parsers
app.use(express.json());
app.use(cookieParser());


app.use(cors({
  origin: [
    'https://event-management-front-end-iota.vercel.app', // Remove trailing slash
    'https://event-management-front-hvhzr3j5f-rakibhasanius-projects.vercel.app', // Add your actual frontend domain
    'http://localhost:3000' // for local development
  ],
  credentials: true,
}));
// application routes
app.use('/api/v1', router);

app.get('/', (req: Request, res: Response) => {
  res.send('Hi Next Level Developer !');
});

app.use(globalErrorHandler);

//Not Found
app.use(notFound);

export default app;
