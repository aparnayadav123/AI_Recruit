package com.recruitai.agent.entity;

public class SkillWeight {
    private String name;
    private int weight; // 1-100

    public SkillWeight() {
    }

    public SkillWeight(String name, int weight) {
        this.name = name;
        this.weight = weight;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getWeight() {
        return weight;
    }

    public void setWeight(int weight) {
        this.weight = weight;
    }
}
