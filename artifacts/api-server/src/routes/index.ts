import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import moviesRouter from "./movies";
import watchlistsRouter from "./watchlists";
import reviewsRouter from "./reviews";
import friendsRouter from "./friends";
import recommendationsRouter from "./recommendations";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(moviesRouter);
router.use(watchlistsRouter);
router.use(reviewsRouter);
router.use(friendsRouter);
router.use(recommendationsRouter);
router.use(notificationsRouter);

export default router;
