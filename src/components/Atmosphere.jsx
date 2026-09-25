import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

function makeKnife(bladeGeometry, bladeMaterial, handleGeometry, handleMaterial, rotation, position) {
  const knife = new THREE.Group();
  const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  blade.position.x = 0.34;
  handle.position.x = -1.3;
  knife.add(blade, handle);
  knife.rotation.z = rotation;
  knife.position.set(...position);
  return knife;
}

export default function Atmosphere({ mode = 'idle' }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !window.WebGLRenderingContext) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.z = 8;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    host.appendChild(renderer.domElement);

    const board = new THREE.Mesh(
      new THREE.CircleGeometry(2.72, 64),
      new THREE.MeshBasicMaterial({ color: 0x9c5732, transparent: true, opacity: 0.23 })
    );
    board.position.z = -1;
    scene.add(board);
    const boardEdge = new THREE.Mesh(
      new THREE.RingGeometry(2.66, 2.73, 64),
      new THREE.MeshBasicMaterial({ color: 0xf1c47a, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    boardEdge.position.z = -0.9;
    scene.add(boardEdge);

    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.45, -0.16);
    bladeShape.lineTo(1.35, -0.16);
    bladeShape.lineTo(1.62, 0);
    bladeShape.lineTo(1.35, 0.16);
    bladeShape.lineTo(-0.45, 0.16);
    bladeShape.closePath();
    const bladeGeometry = new THREE.ShapeGeometry(bladeShape);
    const handleGeometry = new THREE.BoxGeometry(0.92, 0.29, 0.04);
    const bladeMaterial = new THREE.MeshBasicMaterial({ color: 0xfff7e7, transparent: true, opacity: 0.93, side: THREE.DoubleSide });
    const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x4a281d, transparent: true, opacity: 0.96 });
    const topKnife = makeKnife(bladeGeometry, bladeMaterial, handleGeometry, handleMaterial, -0.48, [-0.2, 0.78, 0.9]);
    const bottomKnife = makeKnife(bladeGeometry, bladeMaterial, handleGeometry, handleMaterial, 2.62, [0.35, -0.82, 0.82]);
    scene.add(topKnife, bottomKnife);

    const ingredientGeometry = new THREE.CircleGeometry(0.19, 18);
    const ingredientColors = [0xd85d3e, 0xe6a93b, 0x86a86f, 0xd9766a, 0x8fa87b, 0xf1c46c];
    const ingredients = ingredientColors.map((color, index) => {
      const ingredient = new THREE.Mesh(
        ingredientGeometry,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88, side: THREE.DoubleSide })
      );
      const angle = (index / ingredientColors.length) * Math.PI * 2 + 0.34;
      const radius = 2.14 + (index % 2) * 0.18;
      ingredient.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.2);
      ingredient.userData.baseY = ingredient.position.y;
      ingredient.rotation.z = angle;
      scene.add(ingredient);
      return ingredient;
    });

    const herbGeometry = new THREE.BufferGeometry();
    const herbPoints = new Float32Array(72 * 3);
    for (let index = 0; index < 72; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.25 + Math.random() * 2.45;
      herbPoints[index * 3] = Math.cos(angle) * radius;
      herbPoints[index * 3 + 1] = Math.sin(angle) * radius;
      herbPoints[index * 3 + 2] = -0.2 + Math.random() * 0.25;
    }
    herbGeometry.setAttribute('position', new THREE.BufferAttribute(herbPoints, 3));
    const herbs = new THREE.Points(
      herbGeometry,
      new THREE.PointsMaterial({ color: 0xc4d69d, size: 0.042, transparent: true, opacity: 0.72 })
    );
    scene.add(herbs);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frameId;
    const start = performance.now();
    const animate = (time) => {
      const elapsed = (time - start) / 1000;
      const isSpinning = mode === 'spinning';
      const isRevealing = mode === 'revealed';
      const chop = Math.sin(elapsed * (isSpinning ? 12 : 2.2));
      topKnife.position.x = -0.2 + (isSpinning ? chop * 0.8 : Math.sin(elapsed * 0.72) * 0.08);
      topKnife.position.y = 0.78 + (isSpinning ? Math.abs(chop) * 0.34 : 0);
      topKnife.rotation.z = -0.48 + (isSpinning ? chop * 0.18 : 0);
      bottomKnife.position.x = 0.35 - (isSpinning ? chop * 0.7 : Math.sin(elapsed * 0.65) * 0.06);
      bottomKnife.position.y = -0.82 - (isSpinning ? Math.abs(chop) * 0.28 : 0);
      bottomKnife.rotation.z = 2.62 - (isSpinning ? chop * 0.16 : 0);
      board.rotation.z = elapsed * (isSpinning ? 0.55 : 0.025);
      boardEdge.rotation.z = board.rotation.z;
      board.scale.setScalar(isRevealing ? 1.24 + Math.sin(elapsed * 2) * 0.025 : 1);
      boardEdge.scale.copy(board.scale);
      herbs.rotation.z = elapsed * (isSpinning ? 0.6 : 0.04);
      ingredients.forEach((ingredient, index) => {
        ingredient.position.y = ingredient.userData.baseY + Math.sin(elapsed * (isSpinning ? 8 : 1.2) + index) * (isSpinning ? 0.08 : 0.018);
        ingredient.rotation.z += isSpinning ? 0.045 : 0.003;
      });
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      board.geometry.dispose();
      board.material.dispose();
      boardEdge.geometry.dispose();
      boardEdge.material.dispose();
      bladeGeometry.dispose();
      handleGeometry.dispose();
      bladeMaterial.dispose();
      handleMaterial.dispose();
      ingredientGeometry.dispose();
      ingredients.forEach((ingredient) => ingredient.material.dispose());
      herbGeometry.dispose();
      herbs.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [mode]);

  return <div className={'atmosphere atmosphere--' + mode} ref={hostRef} aria-hidden="true" />;
}
