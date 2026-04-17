ESBUILD := node_modules/.bin/esbuild
FLAGS := --bundle --platform=node --target=es2022 --format=esm --external:@aws-sdk/* --sourcemap

build-LoginFunction:
	$(ESBUILD) src/lambda/user/LoginLambda.ts $(FLAGS) --outfile=$(ARTIFACTS_DIR)/LoginLambda.mjs

build-RegisterFunction:
	$(ESBUILD) src/lambda/user/RegisterLambda.ts $(FLAGS) --outfile=$(ARTIFACTS_DIR)/RegisterLambda.mjs

build-LogoutFunction:
	$(ESBUILD) src/lambda/user/LogoutLambda.ts $(FLAGS) --outfile=$(ARTIFACTS_DIR)/LogoutLambda.mjs

build-GetVacationFunction:
	$(ESBUILD) src/lambda/vacation/GetVacationLambda.ts $(FLAGS) --outfile=$(ARTIFACTS_DIR)/GetVacationLambda.mjs

build-GetVacationsForUserFunction:
	$(ESBUILD) src/lambda/vacation/GetVacationsForUserLambda.ts $(FLAGS) --outfile=$(ARTIFACTS_DIR)/GetVacationsForUserLambda.mjs

build-CreateVacationFunction:
	$(ESBUILD) src/lambda/vacation/CreateVacationLambda.ts $(FLAGS) --outfile=$(ARTIFACTS_DIR)/CreateVacationLambda.mjs

build-UpdateVacationFunction:
	$(ESBUILD) src/lambda/vacation/UpdateVacationLambda.ts $(FLAGS) --outfile=$(ARTIFACTS_DIR)/UpdateVacationLambda.mjs

build-DeleteVacationFunction:
	$(ESBUILD) src/lambda/vacation/DeleteVacationLambda.ts $(FLAGS) --outfile=$(ARTIFACTS_DIR)/DeleteVacationLambda.mjs

build-AddUserFunction:
	$(ESBUILD) src/lambda/vacation/AddUserLambda.ts $(FLAGS) --outfile=$(ARTIFACTS_DIR)/AddUserLambda.mjs

build-RemoveUserFunction:
	$(ESBUILD) src/lambda/vacation/RemoveUserLambda.ts $(FLAGS) --outfile=$(ARTIFACTS_DIR)/RemoveUserLambda.mjs
