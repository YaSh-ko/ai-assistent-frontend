import { motion } from "framer-motion";
import { Compass, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ParticlesBackground from "@/components/ParticlesBackground";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

const PRIMARY_ORB_HORIZONTAL_OFFSET = 40;
const PRIMARY_ORB_VERTICAL_OFFSET = 20;

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full relative flex min-h-screen items-center justify-center overflow-hidden bg-[#000019] text-foreground">
      <ParticlesBackground/>
      <div aria-hidden={true} className="-z-10 absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [
              0,
              PRIMARY_ORB_HORIZONTAL_OFFSET,
              -PRIMARY_ORB_HORIZONTAL_OFFSET,
              0,
            ],
            y: [
              0,
              PRIMARY_ORB_VERTICAL_OFFSET,
              -PRIMARY_ORB_VERTICAL_OFFSET,
              0,
            ],
            rotate: [0, 10, -10, 0],
          }}
          className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-linear-to-tr from-purple-500/20 to-blue-500/20 blur-3xl"
          transition={{
            repeat: Number.POSITIVE_INFINITY,
            duration: 5,
            ease: "easeInOut",
          }}
        />
        <motion.div
          animate={{
            x: [
              0,
              -PRIMARY_ORB_HORIZONTAL_OFFSET,
              PRIMARY_ORB_HORIZONTAL_OFFSET,
              0,
            ],
            y: [
              0,
              -PRIMARY_ORB_VERTICAL_OFFSET,
              PRIMARY_ORB_VERTICAL_OFFSET,
              0,
            ],
          }}
          className="absolute right-1/4 bottom-1/3 h-72 w-72 rounded-full bg-linear-to-br from-indigo-400/10 to-pink-400/10 blur-3xl"
          transition={{
            repeat: Number.POSITIVE_INFINITY,
            duration: 5,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10">
        <Empty>
          <EmptyHeader>
            <EmptyTitle className="font-extrabold text-8xl">404</EmptyTitle>
            <EmptyDescription className="text-nowrap">
              Страница, которую вы ищете, могла быть <br />
              перемещена или больше не существует.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex gap-2">
              <Button onClick={() => navigate("/")}>
                <Home className="mr-2 h-4 w-4" /> На главную
              </Button>
              <Button onClick={() => navigate("/chat")} variant="outline">
                <Compass className="mr-2 h-4 w-4" /> ИИ-чат
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  );
}
