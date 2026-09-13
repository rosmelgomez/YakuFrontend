"use client";

import React from "react";
import { Box, Card, Flex, Text, Button, Slider } from "@radix-ui/themes";
import { filtrarUmbralesSueloAmbiente } from "../selectors";

interface UmbralesFormProps {
  umbrales: any[];
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  isSaving: boolean;
  isLoading: boolean;
  showRecommendBanner: boolean;
  onConfirmDefault: () => void;
  onSliderChange: (id: number, val: number[]) => void;
  onMinChange: (id: number, val: string) => void;
  onMaxChange: (id: number, val: string) => void;
  onInputBlur: (id: number, field: "min" | "max") => void;
  onSave: () => void;
  onCancel: () => void;
}

export function UmbralesForm({
  umbrales,
  isEditing,
  setIsEditing,
  isSaving,
  isLoading,
  showRecommendBanner,
  onConfirmDefault,
  onSliderChange,
  onMinChange,
  onMaxChange,
  onInputBlur,
  onSave,
  onCancel,
}: UmbralesFormProps) {
  const cleanUmbrales = filtrarUmbralesSueloAmbiente(umbrales);

  return (
    <Card
      size="3"
      style={{
        background: "var(--surface-mockup)",
        borderColor: "var(--border-mockup)",
        borderRadius: "16px",
      }}
    >
      <Text size="3" weight="bold" color="indigo" mb="4" as="div">
        🌱 Configuración de Umbrales de Sensores
      </Text>

      {showRecommendBanner && (
        <Box
          mb="4"
          p="3"
          style={{
            background: "rgba(99, 102, 241, 0.08)",
            border: "1px dashed rgba(99, 102, 241, 0.4)",
            borderRadius: "8px",
          }}
        >
          <Text size="2" color="indigo" weight="medium" mb="2" as="div">
            🌱 Se han asignado umbrales recomendados por defecto (10% - 90%).
          </Text>
          <Button size="1" onClick={onConfirmDefault} style={{ cursor: "pointer" }}>
            Aceptar
          </Button>
        </Box>
      )}

      <Flex direction="column" gap="5">
        {isLoading ? (
          <Text size="2" color="gray" style={{ textAlign: "center", padding: "1rem" }}>
            Cargando umbrales del cultivo...
          </Text>
        ) : cleanUmbrales.length === 0 ? (
          <Text size="2" color="gray" style={{ textAlign: "center", padding: "1rem" }}>
            No hay umbrales registrados para este cultivo.
          </Text>
        ) : (
          cleanUmbrales.map((u: any) => (
            <Box key={u.id}>
              <Flex justify="between" align="center" mb="1">
                <Text color="gray" size="2">
                  {u.nombre}
                </Text>
                {isEditing ? (
                  <Flex align="center" gap="1">
                    <input
                      type="number"
                      className="threshold-input"
                      value={u.min}
                      onChange={(e) => onMinChange(u.id, e.target.value)}
                      onBlur={() => onInputBlur(u.id, "min")}
                      style={{
                        width: "45px",
                        background: "rgba(30, 41, 59, 0.5)",
                        border: "1px solid var(--border-mockup)",
                        borderRadius: "4px",
                        color: "var(--green-9)",
                        textAlign: "center",
                        fontSize: "13px",
                        fontWeight: "bold",
                        padding: "1px 2px",
                        outline: "none",
                      }}
                    />
                    <Text size="1" color="gray" weight="bold">
                      -
                    </Text>
                    <input
                      type="number"
                      className="threshold-input"
                      value={u.max}
                      onChange={(e) => onMaxChange(u.id, e.target.value)}
                      onBlur={() => onInputBlur(u.id, "max")}
                      style={{
                        width: "45px",
                        background: "rgba(30, 41, 59, 0.5)",
                        border: "1px solid var(--border-mockup)",
                        borderRadius: "4px",
                        color: "var(--green-9)",
                        textAlign: "center",
                        fontSize: "13px",
                        fontWeight: "bold",
                        padding: "1px 2px",
                        outline: "none",
                      }}
                    />
                    <Text color="green" size="2" weight="bold">
                      {u.unidad}
                    </Text>
                  </Flex>
                ) : (
                  <Text color="green" size="2" weight="bold">
                    {u.min} - {u.max} {u.unidad}
                  </Text>
                )}
              </Flex>
              <Slider
                value={[
                  Math.min(Number(u.min) || 0, Number(u.max) || 0),
                  Math.max(Number(u.min) || 0, Number(u.max) || 0),
                ]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => onSliderChange(u.id, v)}
                style={{ pointerEvents: isEditing ? "auto" : "none" }}
              />
            </Box>
          ))
        )}

        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            style={{ cursor: "pointer", marginTop: "10px" }}
          >
            Actualizar Umbrales
          </Button>
        ) : (
          <Flex gap="3" style={{ marginTop: "10px" }}>
            <Button
              onClick={onSave}
              disabled={isSaving}
              style={{ flex: 1, cursor: "pointer" }}
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
            <Button
              onClick={onCancel}
              variant="soft"
              color="gray"
              disabled={isSaving}
              style={{ flex: 1, cursor: "pointer" }}
            >
              Cancelar
            </Button>
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
