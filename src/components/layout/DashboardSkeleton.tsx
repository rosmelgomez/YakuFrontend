import { Box, Flex, Grid } from "@radix-ui/themes";

type DashboardSkeletonProps = {
  variant?: "dashboard" | "control" | "admin" | "chart" | "form";
};

function SkeletonBlock({
  height,
  width = "100%",
  radius = 8,
}: {
  height: number | string;
  width?: number | string;
  radius?: number;
}) {
  return (
    <Box
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, rgba(30,41,59,0.75), rgba(51,65,85,0.85), rgba(30,41,59,0.75))",
        backgroundSize: "220% 100%",
        animation: "yakuSkeleton 1.35s ease-in-out infinite",
      }}
    />
  );
}

export default function DashboardSkeleton({ variant = "dashboard" }: DashboardSkeletonProps) {
  const isAdmin = variant === "admin";
  const isChart = variant === "chart";
  const isForm = variant === "form";

  return (
    <Box className="page-content" style={{ padding: "2rem 0" }}>
      <Box style={{ width: "100%", maxWidth: "100%", paddingLeft: 16, paddingRight: 16 }}>
        <Flex direction="column" gap="5">
          <Box px="4">
            <Flex align="center" gap="3" mb="3">
              <SkeletonBlock width={44} height={44} radius={10} />
              <Box style={{ flex: 1 }}>
                <SkeletonBlock width="42%" height={28} />
                <Box mt="2">
                  <SkeletonBlock width="58%" height={16} />
                </Box>
              </Box>
            </Flex>
          </Box>

          {isAdmin ? (
            <Grid columns={{ initial: "1", md: "2", xl: "4" }} gap="4" px="4">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonBlock key={index} height={132} radius={12} />
              ))}
            </Grid>
          ) : isChart ? (
            <Grid columns={{ initial: "1", lg: "1.45fr 0.75fr" }} gap="4" px="4">
              <SkeletonBlock height={430} radius={12} />
              <Flex direction="column" gap="4">
                <SkeletonBlock height={132} radius={12} />
                <SkeletonBlock height={132} radius={12} />
                <SkeletonBlock height={132} radius={12} />
              </Flex>
            </Grid>
          ) : isForm ? (
            <Grid columns={{ initial: "1", lg: "1fr 1fr" }} gap="4" px="4">
              <Flex direction="column" gap="4">
                <SkeletonBlock height={110} radius={12} />
                <SkeletonBlock height={260} radius={12} />
              </Flex>
              <SkeletonBlock height={390} radius={12} />
            </Grid>
          ) : (
            <>
              <Grid columns={{ initial: "1", sm: "2", xl: "4" }} gap="4" px="4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonBlock key={index} height={128} radius={12} />
                ))}
              </Grid>
              <Grid columns={{ initial: "1", lg: "1.2fr 0.8fr" }} gap="4" px="4">
                <SkeletonBlock height={360} radius={12} />
                <SkeletonBlock height={360} radius={12} />
              </Grid>
            </>
          )}
        </Flex>
      </Box>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes yakuSkeleton {
              0% { background-position: 100% 0; }
              100% { background-position: -100% 0; }
            }
          `,
        }}
      />
    </Box>
  );
}
